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
  organizationName: z.string().min(1), // this line requires a non-empty organization name
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
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']), // this line allows only the three org roles
});
