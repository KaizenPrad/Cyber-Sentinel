// This file holds validation schemas for authentication:
// registerSchema checks new user signups
// loginSchema checks user logins
// It sits in front of the controller so bad data never reaches the database.

import { z } from 'zod';
// The z library (zod) lets us describe and check the shape of data.

// Now we get to the first major export. It Creates a Export named registerSchema
export const registerSchema = z.object({ // this line starts an object schema for registration
  email: z.string().email(), // this line requires a valid email string
  password: z.string().min(8, 'Password must be at least 8 characters'), // this line requires a password of at least 8 characters
  firstName: z.string().min(1), // this line requires a non-empty first name
  lastName: z.string().min(1), // this line requires a non-empty last name
  organizationName: z.string().min(1).optional(), // required only when creating a new workspace (no invite code)
  inviteCode: z.string().trim().min(4).max(32).optional(), // join code shared by an OWNER/ADMIN to land in their org as EMPLOYEE
});

// This is the loginSchema that checks login bodies
export const loginSchema = z.object({ // this line starts an object schema for login
  email: z.string().email(), // this line requires a valid email string
  password: z.string().min(1), // this line requires a non-empty password
});

// This is the memberParamsSchema that checks the :id URL param for member routes
export const memberParamsSchema = z.object({ // this line starts an object schema for URL params
  id: z.string().uuid(), // this line requires the id param to be a valid UUID
});

// This is the updateMemberRoleSchema that checks role change bodies
export const updateMemberRoleSchema = z.object({ // this line starts an object schema for role updates
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'EMPLOYEE']), // OWNER/ADMIN manage; MEMBER kept for backwards compat, EMPLOYEE is the preferred employee role
});

// This is the addMemberSchema for an OWNER/ADMIN creating a user inside their own org
export const addMemberSchema = z.object({ // an admin adds an employee to their org — no new org is created
  email: z.string().email(), // login email for the new member
  password: z.string().min(8, 'Password must be at least 8 characters'), // initial password, member can change it later
  firstName: z.string().min(1), // required first name
  lastName: z.string().min(1), // required last name
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'EMPLOYEE']).default('EMPLOYEE'), // OWNER-creatable; controller restricts OWNER grants to OWNERs
});
