// Tests helpers.js
// Tests created with assistance from Claude, human reviewed and tested

import {
  validateStatus,
  validatePriority,
  validateAssignmentMutex,
  ok,
  badRequest,
  notFound,
  serverError,
  VALID_STATUSES,
  VALID_PRIORITIES,
  CORS_HEADERS,
  ALLOWED_UPDATE_FIELDS
} from '../src/js/helpers.js';


// Tests for validateStatus, including success case, failure case, 
// and case sensitivity

describe('validateStatus', () => {
  test('returns null for every valid status', () => {
    for (const status of VALID_STATUSES) {
      expect(validateStatus(status)).toBeNull();
    }
  });


  test('returns an error message for an invalid status', () => {
    expect(validateStatus('pending')).toMatch(/Invalid issue_status/);
  });

  test('error message lists all valid statuses', () => {
    const error = validateStatus('unknown');
    for (const status of VALID_STATUSES) {
      expect(error).toContain(status);
    }
  });

  test('is case-sensitive — uppercase is rejected', () => {
    expect(validateStatus('Open')).not.toBeNull();
    expect(validateStatus('OPEN')).not.toBeNull();
  });
});


// Tests for validatePriority, including success case, failure case, 
// and case sensitivity

describe('validatePriority', () => {
  test('returns null for every valid priority', () => {
    for (const priority of VALID_PRIORITIES) {
      expect(validatePriority(priority)).toBeNull();
    }
  });

  test('returns an error message for an invalid priority', () => {
    expect(validatePriority('urgent')).toMatch(/Invalid issue_priority/);
  });

  test('error message lists all valid priorities', () => {
    const error = validatePriority('unknown');
    for (const priority of VALID_PRIORITIES) {
      expect(error).toContain(priority);
    }
  });

  test('is case-sensitive — uppercase is rejected', () => {
    expect(validatePriority('High')).not.toBeNull();
    expect(validatePriority('LOW')).not.toBeNull();
  });
});


// Tests validateAssignmentMutex, all cases

describe('validateAssignmentMutex', () => {
  test('returns null when only a user is assigned', () => {
    expect(validateAssignmentMutex(1, 0)).toBeNull();
    expect(validateAssignmentMutex(1, null)).toBeNull();
  });

  test('returns null when only an agent is assigned', () => {
    expect(validateAssignmentMutex(0, 1)).toBeNull();
    expect(validateAssignmentMutex(null, 1)).toBeNull();
  });

  test('returns null when neither is assigned', () => {
    expect(validateAssignmentMutex(0, 0)).toBeNull();
    expect(validateAssignmentMutex(undefined, undefined)).toBeNull();
  });

  test('returns an error when both are assigned', () => {
    expect(validateAssignmentMutex(1, 1)).toMatch(/cannot be assigned to both/);
  });
});


// Tests for ok helper

describe('ok', () => {
  test('defaults to status 200', async () => {
    const res = ok({ success: true });
    expect(res.status).toBe(200);
  });

  test('accepts a custom status code', async () => {
    const res = ok({ success: true }, 201);
    expect(res.status).toBe(201);
  });

  test('includes CORS headers', () => {
    const res = ok({});
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  test('serializes the body as JSON', async () => {
    const res = ok({ foo: 'bar' });
    const body = await res.json();
    expect(body.foo).toBe('bar');
  });
});


// Tests for badRequest helper

describe('badRequest', () => {
  test('returns status 400', () => {
    expect(badRequest('something went wrong').status).toBe(400);
  });

  test('body has success: false and the error message', async () => {
    const body = await badRequest('Missing required fields').json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Missing required fields');
  });

  test('includes CORS headers', () => {
    expect(badRequest('err').headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});


// Tests for notFound helper, tests default message and also tests overriding 
// message with a custom one

describe('notFound', () => {
  test('returns status 404', () => {
    expect(notFound().status).toBe(404);
  });

  test('uses default message when none is provided', async () => {
    const body = await notFound().json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Issue not found');
  });

  test('accepts a custom error message', async () => {
    const body = await notFound('Custom not found message').json();
    expect(body.error).toBe('Custom not found message');
  });

  test('includes CORS headers', () => {
    expect(notFound().headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});


// Tests for serverError Helper, similar to badRequest

describe('serverError', () => {
  test('returns status 500', () => {
    expect(serverError('server error').status).toBe(500);
  });

  test('body has success: false and the error message', async () => {
    const body = await serverError('server error').json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('server error');
  });

  test('includes CORS headers', () => {
    expect(serverError('err').headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});


// Additional Tests ensuring fields and methods are consistent

describe('CORS_HEADERS', () => {
  test('allows all origins', () => {
    expect(CORS_HEADERS['Access-Control-Allow-Origin']).toBe('*');
  });

  test('allows the required HTTP methods', () => {
    const methods = CORS_HEADERS['Access-Control-Allow-Methods'];
    for (const method of ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']) {
      expect(methods).toContain(method);
    }
  });
});

describe('ALLOWED_UPDATE_FIELDS', () => {
  test('does not include immutable fields', () => {
    expect(ALLOWED_UPDATE_FIELDS).not.toContain('id');
    expect(ALLOWED_UPDATE_FIELDS).not.toContain('created_at');
  });

  test('includes expected mutable fields', () => {
    expect(ALLOWED_UPDATE_FIELDS).toContain('title');
    expect(ALLOWED_UPDATE_FIELDS).toContain('issue_status');
    expect(ALLOWED_UPDATE_FIELDS).toContain('issue_priority');
  });
});
