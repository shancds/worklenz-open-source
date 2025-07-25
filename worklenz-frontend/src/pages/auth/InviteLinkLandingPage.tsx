import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card, Input, Button, Typography, Form, message, Spin, Flex } from 'antd/es';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { validateEmail } from '@/utils/validateEmail';
import { useAuthService } from '@/hooks/useAuth';
import { projectMembersApiService } from '@/api/project-members/project-members.api.service';
import logo from '@/assets/images/worklenz-light-mode.png';
import logoDark from '@/assets/images/worklenz-dark-mode.png';

const COMPANY_EMAIL_REGEX = /@ceydigital\.com$/i; // TODO: Replace with your actual company domain logic

const ProjectInviteLandingPage: React.FC = () => {
  const themeMode = useAppSelector(state => state.themeReducer.mode);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { projectId } = useParams();
  const { invitationId } = useParams();
  const [searchParams] = useSearchParams();
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
  const [email, setEmail] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);
  const currentSession = useAuthService().getCurrentSession();
  const [loading, setLoading] = useState(true);
  const [inviteLinkData, setInviteLinkData] = useState<{
    invite_link_id: string | null;
    expires_date: string | null;
    project_id: string | null;
    team_id: string | null;
    is_member?: boolean;
  }>({
    invite_link_id: null,
    expires_date: null,
    project_id: null,
    team_id: null,
    is_member: undefined,
  });

  useEffect(() => {
    const verifyInviteLink = async () => {
      if (projectId && invitationId) {
        const res = await projectMembersApiService.verifyProjectInviteLink({ project_id: projectId, invitation_id: invitationId });
        if (res.done) {
          setInviteLinkData(res.body);
          if (currentSession && res.body?.is_member) {
            navigate(`/worklenz/projects/${projectId}`);
          }
        } else {
          console.log('res.done', res.done);
          // navigate('/auth/login');
        }
        setLoading(false);
      }
    };
    verifyInviteLink();
  }, [navigate]);

  const handleCheckEmail = async () => {
    setError('');
    if (!validateEmail(email)) {
      setError(t('project-invite.invalidEmail', 'Please enter a valid email address.'));
      return;
    }
    setChecking(true);
    try {
      const res = await projectMembersApiService.acceptProjectInvite({
        project_id: projectId!,
        invitation_id: invitationId!,
        email: email.trim(),
      });
      if (res.done) {
        if (res.body?.needs_signup) {
          message.info(t('project-invite.signupPrompt', 'No account found. Please sign up to join the project.'));
          navigate(`/auth/signup?email=${encodeURIComponent(email)}&project=${projectId}`);
        } else if (res.body?.already_in_project) {
          message.info(t('project-invite.loginPrompt', 'Account found. Please sign in to accept the invite.'));
          navigate(`/auth/login?email=${encodeURIComponent(email)}&project=${projectId}`);
        } else if (res.body?.added_to_project) {
          message.success(t('project-invite.addedToProject', 'You have been added to the project. Please sign in.'));
          navigate(`/auth/login?email=${encodeURIComponent(email)}&project=${projectId}`);
        } else {
          setError(t('project-invite.unknownResponse', 'Unknown response from server.'));
        }
      } else {
        setError(res.message || t('project-invite.error', 'Something went wrong. Please try again.'));
      }
    } catch (e: any) {
      setError(t('project-invite.error', 'Something went wrong. Please try again.'));
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return (
      <Card style={{ width: '100%', textAlign: 'center', marginTop: 48 }}>
        <Spin size="large" />
      </Card>
    );
  }

  // If the link is invalid
  if (!inviteLinkData.invite_link_id) {
    return (
      <Card style={{ width: '100%', maxWidth: 400, margin: '48px auto', textAlign: 'center' }}>
        <Typography.Title level={3} type="danger">
          {t('project-invite.invalidLink', 'Invalid or expired invitation link')}
        </Typography.Title>
        <Typography.Paragraph>
          {t('project-invite.invalidLinkDesc', 'This invitation link is not valid or has expired. Please contact the project owner for a new invitation.')}
        </Typography.Paragraph>
      </Card>
    );
  }

  // If the user is not a member, show invite details and email entry
  return (
    <Card style={{ width: '100%', maxWidth: 400, margin: '48px auto', textAlign: 'center' }}>
      <Flex vertical align="center" gap={8} style={{ marginBottom: 24 }}>
        <img
          src={themeMode === 'dark' ? logoDark : logo}
          alt="worklenz logo"
          style={{ width: '100%', maxWidth: 220 }}
        />
      </Flex>
      <Typography.Title level={3}>{t('project-invite.welcome', 'Welcome to Worklenz')}</Typography.Title>
      <Typography.Paragraph>
        {t('project-invite.invitedToProject', 'Join with Invite Link')}
      </Typography.Paragraph>
      <Typography.Paragraph>{t('project-invite.enterEmail', 'Enter your email to continue')}</Typography.Paragraph>
      <Form onFinish={handleCheckEmail} layout="vertical">
        <Form.Item
          validateStatus={error ? 'error' : ''}
          help={error}
          style={{ marginBottom: 8 }}
        >
          <Input
            type="email"
            placeholder={t('project-invite.emailPlaceholder', 'Email address')}
            value={email}
            onChange={e => setEmail(e.target.value)}
            size="large"
            autoFocus
          />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" block loading={checking} size="large">
            {t('project-invite.continue', 'Continue')}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default ProjectInviteLandingPage; 