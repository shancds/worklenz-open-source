- Create project_invitations table for project-level invite links
-- This allows projects to generate a single invite link that any user can use to join

CREATE TABLE IF NOT EXISTS project_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
    usage_count INTEGER DEFAULT 0,
    max_usage INTEGER DEFAULT NULL, -- NULL means unlimited usage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure only one active invitation per project
    CONSTRAINT unique_project_invitation UNIQUE (project_id)
);

-- Create indexes for project_invitations table
CREATE INDEX IF NOT EXISTS idx_project_invitations_token ON project_invitations(token);
CREATE INDEX IF NOT EXISTS idx_project_invitations_project_id ON project_invitations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_invitations_status ON project_invitations(status);
CREATE INDEX IF NOT EXISTS idx_project_invitations_expires_at ON project_invitations(expires_at);

-- Add comments for documentation
COMMENT ON TABLE project_invitations IS 'Stores project-level invitation links for project access';
COMMENT ON COLUMN project_invitations.token IS 'Unique token used in the invitation URL';
COMMENT ON COLUMN project_invitations.usage_count IS 'Number of times this invitation has been used';
COMMENT ON COLUMN project_invitations.max_usage IS 'Maximum number of times this invitation can be used (NULL = unlimited)';
COMMENT ON COLUMN project_invitations.status IS 'Status of the invitation: active, expired, or revoked';

-- Create function to clean up expired project invitations
CREATE OR REPLACE FUNCTION cleanup_expired_project_invitations()
RETURNS void AS $$
BEGIN
    UPDATE project_invitations
    SET status = 'expired', updated_at = NOW()
    WHERE expires_at < NOW() AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_invitations_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_invitations_updated_at_trigger
    BEFORE UPDATE ON project_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_project_invitations_updated_at();
