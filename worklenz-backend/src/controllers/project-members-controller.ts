import {IWorkLenzRequest} from "../interfaces/worklenz-request";
import {IWorkLenzResponse} from "../interfaces/worklenz-response";

import db from "../config/db";
import {ServerResponse} from "../models/server-response";
import WorklenzControllerBase from "./worklenz-controller-base";
import HandleExceptions from "../decorators/handle-exceptions";
import {getColor} from "../shared/utils";
import TeamMembersController from "./team-members-controller";
import {checkTeamSubscriptionStatus} from "../shared/paddle-utils";
import {updateUsers} from "../shared/paddle-requests";
import {statusExclude} from "../shared/constants";
import {NotificationsService} from "../services/notifications/notifications.service";
import TokenService from "../services/token-service";

export default class ProjectMembersController extends WorklenzControllerBase {

  public static async checkIfUserAlreadyExists(owner_id: string, email: string) {
    if (!owner_id) throw new Error("Owner not found.");

    const q = `SELECT EXISTS(SELECT tmi.team_member_id
              FROM team_member_info_view AS tmi
                       JOIN teams AS t ON tmi.team_id = t.id
              WHERE tmi.email = $1::TEXT
                AND t.user_id = $2::UUID);`;
    const result = await db.query(q, [email, owner_id]);

    const [data] = result.rows;
    return data.exists;
  }

  public static async createOrInviteMembers(body: any) {
    if (!body) return;

    const q = `SELECT create_project_member($1) AS res;`;

    const result = await db.query(q, [JSON.stringify(body)]);
    const [data] = result.rows;

    const response = data.res;

    if (response?.notification && response?.member_user_id) {
      NotificationsService.sendNotification({
        receiver_socket_id: response.socket_id,
        project: response.project,
        message: response.notification,
        project_color: response.project_color,
        project_id: response.project_id,
        team: response.team,
        team_id: body.team_id
      });
    }
    return data;
  }

  @HandleExceptions()
  public static async create(req: IWorkLenzRequest, res: IWorkLenzResponse): Promise<IWorkLenzResponse> {
    req.body.user_id = req.user?.id;
    req.body.team_id = req.user?.team_id;
    req.body.access_level = req.body.access_level ? req.body.access_level : "MEMBER";
    const data = await this.createOrInviteMembers(req.body);
    return res.status(200).send(new ServerResponse(true, data));
  }

  @HandleExceptions({
    raisedExceptions: {
      "ERROR_EMAIL_INVITATION_EXISTS": "Member already have a pending invitation that has not been accepted."
    }
  })
  public static async createByEmail(req: IWorkLenzRequest, res: IWorkLenzResponse): Promise<IWorkLenzResponse> {
    req.body.user_id = req.user?.id;
    req.body.team_id = req.user?.team_id;

    if (!req.user?.team_id) return res.status(200).send(new ServerResponse(false, "Required fields are missing."));

    // check the subscription status
    const subscriptionData = await checkTeamSubscriptionStatus(req.user?.team_id);

    const userExists = await this.checkIfUserAlreadyExists(req.user?.owner_id as string, req.body.email);

    // Return error if user already exists
    if (userExists) {
      return res.status(200).send(new ServerResponse(false, null, "User already exists in the team."));
    }

    // Handle self-hosted subscriptions differently
    if (subscriptionData.subscription_type === "SELF_HOSTED") {
      // Adding as a team member
      const teamMemberReq: { team_id?: string; emails: string[], project_id?: string; } = {
        team_id: req.user?.team_id,
        emails: [req.body.email]
      };

      if (req.body.project_id)
        teamMemberReq.project_id = req.body.project_id;

      const [member] = await TeamMembersController.createOrInviteMembers(teamMemberReq, req.user);

      if (!member)
        return res.status(200).send(new ServerResponse(true, null, "Failed to add the member to the project. Please try again."));

      // Adding to the project
      const projectMemberReq = {
        team_member_id: member.team_member_id,
        team_id: req.user?.team_id,
        project_id: req.body.project_id,
        user_id: req.user?.id,
        access_level: req.body.access_level ? req.body.access_level : "MEMBER"
      };
      const data = await this.createOrInviteMembers(projectMemberReq);
      return res.status(200).send(new ServerResponse(true, data.member));
    }

    if (statusExclude.includes(subscriptionData.subscription_status)) {
      return res.status(200).send(new ServerResponse(false, null, "Unable to add user! Please check your subscription status."));
    }

    if (!userExists && subscriptionData.is_ltd && subscriptionData.current_count && (parseInt(subscriptionData.current_count) + 1 > parseInt(subscriptionData.ltd_users))) {
      return res.status(200).send(new ServerResponse(false, null, "Maximum number of life time users reached."));
    }

    // if (subscriptionData.status === "trialing") break;
    if (!userExists && !subscriptionData.is_credit && !subscriptionData.is_custom && subscriptionData.subscription_status !== "trialing") {
      // if (subscriptionData.subscription_status === "active") {
      //   const response = await updateUsers(subscriptionData.subscription_id, (subscriptionData.quantity + 1));
      //   if (!response.body.subscription_id) return res.status(200).send(new ServerResponse(false, null, response.message || "Unable to add user! Please check your subscription."));
      // }
      const updatedCount = parseInt(subscriptionData.current_count) + 1;
      const requiredSeats = updatedCount - subscriptionData.quantity;
      if (updatedCount > subscriptionData.quantity) {
        const obj = {
          seats_enough: false,
          required_count: requiredSeats,
          current_seat_amount: subscriptionData.quantity
        };
        return res.status(200).send(new ServerResponse(false, obj, null));
      }
    }

    // Adding as a team member
    const teamMemberReq: { team_id?: string; emails: string[], project_id?: string; } = {
      team_id: req.user?.team_id,
      emails: [req.body.email]
    };

    if (req.body.project_id)
      teamMemberReq.project_id = req.body.project_id;

    const [member] = await TeamMembersController.createOrInviteMembers(teamMemberReq, req.user);

    if (!member)
      return res.status(200).send(new ServerResponse(true, null, "Failed to add the member to the project. Please try again."));

    // Adding to the project
    const projectMemberReq = {
      team_member_id: member.team_member_id,
      team_id: req.user?.team_id,
      project_id: req.body.project_id,
      user_id: req.user?.id,
      access_level: req.body.access_level ? req.body.access_level : "MEMBER"
    };
    const data = await this.createOrInviteMembers(projectMemberReq);
    return res.status(200).send(new ServerResponse(true, data.member));
  }

  @HandleExceptions()
  public static async generateProjectInviteLink(req: IWorkLenzRequest, res: IWorkLenzResponse): Promise<IWorkLenzResponse> {
    const user_id = req.user?.id;
    const team_id = req.user?.team_id;
    const project_id = req.body.project_id;

    if (!user_id || !team_id || !project_id) {
      return res.status(400).send(new ServerResponse(false, null, "Authorization failed."));
    }

    const project = await db.query(`SELECT * FROM projects WHERE id = $1 AND team_id = $2`, [project_id, team_id]);
    if (!project.rows.length) {
      return res.status(400).send(new ServerResponse(false, null, "Project not found."));
    }

    const expires_at = Date.now() + 1000 * 60 * 60 * 24;

    const invite_token = TokenService.generateProjectInviteToken({
      projectId: project_id,
      userId: user_id,
      type: "project_invite",
      expiresAt: expires_at,
      projectName: project.rows[0].name,
    });

    const q = `INSERT INTO project_invitations (project_id, token, invited_by, expires_at, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())
    ON CONFLICT (project_id)
    DO UPDATE SET
    token = EXCLUDED.token,
    invited_by = EXCLUDED.invited_by,
    expires_at = EXCLUDED.expires_at,
    updated_at = NOW()
    RETURNING id;`;
    const result = await db.query(q, [project_id, invite_token, user_id, new Date(expires_at)]);
    const invitationId = result.rows[0]?.id;
    return res.status(200).send(new ServerResponse(true, {
      invitation_id: invitationId,
      expires_at: new Date(expires_at).toISOString()
    }, "Project invite link copied."));
  }

  @HandleExceptions()
  public static async verifyProjectInviteLink(req: IWorkLenzRequest, res: IWorkLenzResponse) {
    const {project_id, invitation_id} = req.body;
    if (!project_id || !invitation_id) {
      return res.status(400).send(new ServerResponse(false, null, "Invalid request."));
    }
    const q = `SELECT pi.id as invite_link_id, pi.expires_at, pi.project_id, p.team_id FROM project_invitations pi INNER JOIN projects p ON pi.project_id = p.id WHERE pi.project_id = $1 AND pi.id = $2 AND pi.expires_at > NOW() AND pi.status = 'active';`;
    const result = await db.query(q, [project_id, invitation_id]);
    const [data] = result.rows;
    if (!data) {
      return res.status(400).send(new ServerResponse(false, null, "Invalid request."));
    }
    let is_member = false;
    if (req.user && req.user.id) {
      // Find team_member_id for this user in the project's team
      const qMember = `SELECT tm.id FROM team_members tm WHERE tm.user_id = $1 AND tm.team_id = $2`;
      const resultMember = await db.query(qMember, [req.user.id, data.team_id]);
      const teamMember = resultMember.rows[0];
      if (teamMember) {
        is_member = await this.checkIfMemberExists(project_id, teamMember.id);
      }
    }
    return res.status(200).send(new ServerResponse(true, {
      invite_link_id: data.invite_link_id,
      expires_date: data.expires_at ? new Date(data.expires_at).toISOString() : null,
      project_id: data.project_id,
      team_id: data.team_id,
      is_member
    }));
  }

  public static async acceptProjectInvite(req: IWorkLenzRequest, res: IWorkLenzResponse) {
    const {project_id, invitation_id, email} = req.body;
    if (!project_id || !invitation_id || !email) {
      return res.status(400).send(new ServerResponse(false, null, "Invalid request."));
    }
    // Get invitation and project/team info
    const qInvite = `SELECT pi.id as invite_link_id, pi.expires_at, pi.project_id, p.team_id FROM project_invitations pi INNER JOIN projects p ON pi.project_id = p.id WHERE pi.project_id = $1 AND pi.id = $2 AND pi.expires_at > NOW() AND pi.status = 'active';`;
    const resultInvite = await db.query(qInvite, [project_id, invitation_id]);
    const inviteData = resultInvite.rows[0];
    if (!inviteData) {
      return res.status(400).send(new ServerResponse(false, null, "Invalid or expired invitation."));
    }
    // Check if user exists
    const qUser = `SELECT u.id FROM users u WHERE u.email = $1;`;
    const resultUser = await db.query(qUser, [email.trim()]);
    const userData = resultUser.rows[0];
    if (!userData) {
      return res.status(200).send(new ServerResponse(false, { needs_signup: true }, "User does not exist. Please sign up."));
    }
    // Check if user is already a team member
    const qTeamMember = `SELECT tm.id FROM team_members tm WHERE tm.user_id = $1 AND tm.team_id = $2`;
    const resultTeamMember = await db.query(qTeamMember, [userData.id, inviteData.team_id]);
    let teamMemberId;
    if (resultTeamMember.rows.length > 0) {
      teamMemberId = resultTeamMember.rows[0].id;
    } else {
      // Add as team member
      const teamMemberReq = { team_id: inviteData.team_id, emails: [email.trim()] };
      const [member] = await TeamMembersController.createOrInviteMembers(teamMemberReq, req.user || {});
      teamMemberId = member.team_member_id;
    }
    // Check if already in project
    const isMember = await this.checkIfMemberExists(project_id, teamMemberId);
    if (isMember) {
      return res.status(200).send(new ServerResponse(true, { already_in_project: true }, "User already exists in the project."));
    }
    // Add to project
    const projectMemberReq = {
      team_member_id: teamMemberId,
      team_id: inviteData.team_id,
      project_id: project_id,
      user_id: userData.id,
      access_level: "MEMBER"
    };
    await this.createOrInviteMembers(projectMemberReq);
    // Increment usage_count
    await db.query(`UPDATE project_invitations SET usage_count = usage_count + 1 WHERE id = $1`, [invitation_id]);
    return res.status(200).send(new ServerResponse(true, { added_to_project: true }, "User added to the project."));
  }

  @HandleExceptions()
  public static async get(req: IWorkLenzRequest, res: IWorkLenzResponse): Promise<IWorkLenzResponse> {
    const q = `
      SELECT project_members.id,
             tm.id AS team_member_id,
             (SELECT email FROM team_member_info_view WHERE team_member_info_view.team_member_id = tm.id),
             (SELECT name FROM team_member_info_view WHERE team_member_id = project_members.team_member_id) AS name,
             u.avatar_url,
             jt.name AS job_title
      FROM project_members
             INNER JOIN team_members tm ON project_members.team_member_id = tm.id
             LEFT JOIN job_titles jt ON tm.job_title_id = jt.id
             LEFT JOIN users u ON tm.user_id = u.id
      WHERE project_id = $1
      ORDER BY project_members.created_at DESC;
    `;
    const result = await db.query(q, [req.params.id]);

    result.rows.forEach((a: any) => a.color_code = getColor(a.name));

    return res.status(200).send(new ServerResponse(true, result.rows));
  }

  public static async checkIfMemberExists(projectId: string, teamMemberId: string) {
    const q = `SELECT EXISTS(SELECT id FROM project_members WHERE project_id = $1::UUID AND team_member_id = $2::UUID)`;
    const result = await db.query(q, [projectId, teamMemberId]);
    const [data] = result.rows;
    return data.exists;
  }

  @HandleExceptions()
  public static async deleteById(req: IWorkLenzRequest, res: IWorkLenzResponse): Promise<IWorkLenzResponse> {
    const q = `SELECT remove_project_member($1, $2, $3) AS res;`;
    const result = await db.query(q, [req.params.id, req.user?.id, req.user?.team_id]);
    const [data] = result.rows;

    const response = data.res;

    if (response?.notification && response?.member_user_id) {
      NotificationsService.sendNotification({
        receiver_socket_id: response.socket_id,
        project: response.project,
        message: response.notification,
        project_color: response.project_color,
        project_id: response.project_id,
        team: response.team,
        team_id: req.user?.team_id as string
      });
    }

    return res.status(200).send(new ServerResponse(true, result.rows));
  }
}
