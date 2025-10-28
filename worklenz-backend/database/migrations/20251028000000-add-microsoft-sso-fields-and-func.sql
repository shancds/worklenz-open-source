-- Add Microsoft SSO fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS microsoft_id TEXT,
ADD COLUMN IF NOT EXISTS microsoft_tenant_id TEXT;

-- Create indexes for Microsoft SSO fields
CREATE INDEX IF NOT EXISTS idx_users_microsoft_id ON users(microsoft_id);
CREATE INDEX IF NOT EXISTS idx_users_microsoft_tenant_id ON users(microsoft_tenant_id);

-- Add unique constraint for Microsoft ID (similar to Google ID)
ALTER TABLE users 
ADD CONSTRAINT unique_microsoft_id UNIQUE (microsoft_id);

-- Update existing users query to include Microsoft fields
COMMENT ON COLUMN users.microsoft_id IS 'Microsoft Azure AD Object ID (oid)';
COMMENT ON COLUMN users.microsoft_tenant_id IS 'Microsoft Azure AD Tenant ID (tid)';


CREATE OR REPLACE FUNCTION register_microsoft_user(_body json) RETURNS json
    LANGUAGE plpgsql
AS
$$
DECLARE
    _user_id         UUID;
    _organization_id UUID;
    _team_id         UUID;
    _role_id         UUID;

    _name            TEXT;
    _email           TEXT;
    _microsoft_id    TEXT;
    _tenant_id       TEXT;
BEGIN
    _name = (_body ->> 'displayName')::TEXT;
    _email = (_body ->> 'email')::TEXT;
    _microsoft_id = (_body ->> 'id');
    _tenant_id = (_body ->> 'tenantId');

    INSERT INTO users (name, email, microsoft_id, microsoft_tenant_id, timezone_id)
    VALUES (_name, _email, _microsoft_id, _tenant_id, COALESCE((SELECT id FROM timezones WHERE name = (_body ->> 'timezone')),
                                                               (SELECT id FROM timezones WHERE name = 'UTC')))
    RETURNING id INTO _user_id;

    --insert organization data
    INSERT INTO organizations (user_id, organization_name, contact_number, contact_number_secondary, trial_in_progress,
                               trial_expire_date, subscription_status, license_type_id)
    VALUES (_user_id, TRIM((_body ->> 'displayName')::TEXT), NULL, NULL, TRUE, CURRENT_DATE + INTERVAL '9999 days',
            'active', (SELECT id FROM sys_license_types WHERE key = 'SELF_HOSTED'))
    RETURNING id INTO _organization_id;

    INSERT INTO teams (name, user_id, organization_id)
    VALUES (_name, _user_id, _organization_id)
    RETURNING id INTO _team_id;

    -- insert default roles
    INSERT INTO roles (name, team_id, default_role) VALUES ('Member', _team_id, TRUE);
    INSERT INTO roles (name, team_id, admin_role) VALUES ('Admin', _team_id, TRUE);
    INSERT INTO roles (name, team_id, owner) VALUES ('Owner', _team_id, TRUE) RETURNING id INTO _role_id;

    INSERT INTO team_members (user_id, team_id, role_id)
    VALUES (_user_id, _team_id, _role_id);

    IF (is_null_or_empty(_body ->> 'team') OR is_null_or_empty(_body ->> 'member_id'))
    THEN
        UPDATE users SET active_team = _team_id WHERE id = _user_id;
    ELSE
        -- Verify team member
        IF EXISTS(SELECT id
                  FROM team_members
                  WHERE id = (_body ->> 'member_id')::UUID
                    AND team_id = (_body ->> 'team')::UUID)
        THEN
            UPDATE team_members
            SET user_id = _user_id
            WHERE id = (_body ->> 'member_id')::UUID
              AND team_id = (_body ->> 'team')::UUID;

            DELETE
            FROM email_invitations
            WHERE team_id = (_body ->> 'team')::UUID
              AND team_member_id = (_body ->> 'member_id')::UUID;

            UPDATE users SET active_team = (_body ->> 'team')::UUID WHERE id = _user_id;
        END IF;
    END IF;

    RETURN JSON_BUILD_OBJECT(
            'id', _user_id,
            'email', _email,
            'microsoft_id', _microsoft_id,
            'microsoft_tenant_id', _tenant_id
           );
END
$$;