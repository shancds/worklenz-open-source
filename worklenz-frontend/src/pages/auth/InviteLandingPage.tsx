import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card, Input, Button, Typography, Form, message, Spin } from 'antd/es';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { validateEmail } from '@/utils/validateEmail';
import { useAuthService } from '@/hooks/useAuth';
import { projectMembersApiService } from '@/api/project-members/project-members.api.service';

const COMPANY_EMAIL_REGEX = /@ceydigital\.com$/i; // TODO: Replace with your actual company domain logic

const ProjectInviteLandingPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { projectId } = useParams<{ projectId: string }>();
  const { invitationId } = useParams<{ invitationId: string }>();
  const [searchParams] = useSearchParams();
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
  const [email, setEmail] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);
  const currentSession = useAuthService().getCurrentSession();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentSession && projectId && invitationId) {
        acceptInvite(currentSession.email || '');
    }
    setLoading(false);
  }, [isAuthenticated, projectId, invitationId, t, navigate]);

  const acceptInvite = async (email: string) => {
    const res = await projectMembersApiService.acceptProjectInvite({ project_id: projectId, invitation_id: invitationId, email: email });
    if (res.done) {
      navigate(`/worklenz/projects/${projectId}`);
    }
  }
  const handleCheckEmail = async () => {
    setError('');
    if (!validateEmail(email)) {
      setError(t('project-invite.invalidEmail', 'Please enter a valid email address.'));
      return;
    }
    setChecking(true);
    try {
      // Check if email is registered
      const res = await projectMembersApiService.acceptProjectInvite({ project_id: projectId, invitation_id: invitationId, email: email });
      if (res.done) {
        // Email exists, redirect to login with pre-filled params
        message.info(t('project-invite.loginPrompt', 'Account found. Please sign in to accept the invite.'));
        navigate(`/auth/login?email=${encodeURIComponent(email)}&project=${projectId}`);
      } else {
        // Email does not exist, check if company email
        if (!COMPANY_EMAIL_REGEX.test(email)) {
          setError(t('project-invite.companyEmailRequired', 'A company email address or an invitation is required to view this link.'));
          return;
        }
        // Redirect to signup with pre-filled params
        message.info(t('project-invite.signupPrompt', 'No account found. Please sign up to join the project.'));
        navigate(`/auth/signup?email=${encodeURIComponent(email)}&project=${projectId}`);
      }
    } catch (e) {
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

  if (accepting) {
    return (
      <Card style={{ width: '100%', textAlign: 'center', marginTop: 48 }}>
        <Spin size="large" />
        <Typography.Title level={4}>{t('project-invite.joining', 'Joining project...')}</Typography.Title>
      </Card>
    );
  }

  if (!currentSession) {
    return (
        <Card style={{ width: '100%', maxWidth: 400, margin: '48px auto', textAlign: 'center' }}>
        <Typography.Title level={3}>{t('project-invite.welcome', 'Welcome to Worklenz')}</Typography.Title>
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
  }

  return <div>Authenticating...</div>;
};

export default ProjectInviteLandingPage; 