import { IProjectMemberViewModel } from '@/types/projectMember.types';
import apiClient from '../api-client';
import { API_BASE_URL, AUTH_API_BASE_URL } from '@/shared/constants';
import { IServerResponse } from '@/types/common.types';
import { toQueryString } from '@/utils/toQueryString';

const rootUrl = `${API_BASE_URL}/project-members`;

export const projectMembersApiService = {
  createProjectMember: async (
    body: IProjectMemberViewModel
  ): Promise<IServerResponse<IProjectMemberViewModel>> => {
    const q = toQueryString({ current_project_id: body.project_id });

    const response = await apiClient.post<IServerResponse<IProjectMemberViewModel>>(
      `${rootUrl}${q}`,
      body
    );
    return response.data;
  },

  createByEmail: async (body: {
    project_id: string;
    email: string;
  }): Promise<IServerResponse<IProjectMemberViewModel>> => {
    const response = await apiClient.post<IServerResponse<IProjectMemberViewModel>>(
      `${rootUrl}/invite`,
      body
    );
    return response.data;
  },

  generateProjectInviteLink: async (body: {
    project_id: string;
  }): Promise<IServerResponse<IProjectMemberViewModel>> => {
    const response = await apiClient.post<IServerResponse<IProjectMemberViewModel>>(
      `${rootUrl}/invite/link/project`,
      body
    );
    return response.data;
  },

  verifyProjectInviteLink: async (body: {
    project_id: string;
    invitation_id: string;
  }): Promise<IServerResponse<{
    invite_link_id: string;
    expires_date: string;
    project_id: string;
    team_id: string;
    is_member?: boolean;
  }>> => {
    const response = await apiClient.post<IServerResponse<{
      invite_link_id: string;
      expires_date: string;
      project_id: string;
      team_id: string;
      is_member?: boolean;
    }>>(
      `${AUTH_API_BASE_URL}/auth/verify-project-invite-link`,
      body
    );
    return response.data;
  },

  getByProjectId: async (
    projectId: string
  ): Promise<IServerResponse<IProjectMemberViewModel[]>> => {
    const response = await apiClient.get<IServerResponse<IProjectMemberViewModel[]>>(
      `${rootUrl}/${projectId}`
    );
    return response.data;
  },

  deleteProjectMember: async (
    id: string,
    currentProjectId: string
  ): Promise<IServerResponse<IProjectMemberViewModel>> => {
    const q = toQueryString({ current_project_id: currentProjectId });
    const response = await apiClient.delete<IServerResponse<IProjectMemberViewModel>>(
      `${rootUrl}/${id}${q}`
    );
    return response.data;
  },

  acceptProjectInvite: async (body: {
    project_id: string;
    invitation_id: string;
    email: string;
  }): Promise<IServerResponse<any>> => {
    const response = await apiClient.post<IServerResponse<any>>(
      `${rootUrl}/accept-project-invite`,
      body
    );
    return response.data;
  },
};
