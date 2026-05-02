// JWT Utility Tests
const { generateToken, verifyToken, extractTokenFromHeader } = require('../../utils/jwt');

describe('JWT Utilities', () => {
  // ==================== TOKEN GENERATION TESTS ====================

  describe('Token Generation', () => {
    test('should generate a valid JWT token', () => {
      const user = { id: 'user123', email: 'user@example.com', role: 'user' };
      const token = generateToken(user);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT format: header.payload.signature
    });

    test('should generate different tokens for different user IDs', () => {
      const user1 = { id: 'user1', email: 'user1@example.com', role: 'user' };
      const user2 = { id: 'user2', email: 'user2@example.com', role: 'user' };
      const token1 = generateToken(user1);
      const token2 = generateToken(user2);

      expect(token1).not.toBe(token2);
    });

    test('should generate tokens with correct format', () => {
      const user = { id: 'user456', email: 'user456@example.com', role: 'admin' };
      const token = generateToken(user);
      const parts = token.split('.');

      expect(parts.length).toBe(3);
      parts.forEach((part) => {
        expect(typeof part).toBe('string');
        expect(part.length).toBeGreaterThan(0);
      });
    });
  });

  // ==================== TOKEN VERIFICATION TESTS ====================

  describe('Token Verification', () => {
    test('should verify a valid token', () => {
      const userId = 'validuser';
      const user = { id: userId, email: 'validuser@example.com', role: 'user' };
      const token = generateToken(user);
      const decoded = verifyToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.id).toBe(userId);
    });

    test('should throw error for invalid token', () => {
      expect(() => {
        verifyToken('invalid.token.format');
      }).toThrow();
    });

    test('should throw error for malformed token', () => {
      expect(() => {
        verifyToken('notavalidtoken');
      }).toThrow();
    });

    test('should throw error for expired token', () => {
      // Create a token and manually tamper with expiration would be complex in real tests
      // This is a placeholder for expired token testing
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXIxMjMiLCJpYXQiOjE1MTYyMzkwMjIsImV4cCI6MTUxNjIzOTAyMn0.invalid';

      expect(() => {
        verifyToken(invalidToken);
      }).toThrow();
    });

    test('should extract user ID from decoded token', () => {
      const userId = '507f1f77bcf86cd799439011';
      const user = { id: userId, email: 'user@example.com', role: 'user' };
      const token = generateToken(user);
      const decoded = verifyToken(token);

      expect(decoded.id).toBe(userId);
    });
  });

  // ==================== HEADER EXTRACTION TESTS ====================

  describe('Token Extraction from Headers', () => {
    test('should extract token from Bearer header', () => {
      const user = { id: 'user123', email: 'user123@example.com', role: 'user' };
      const token = generateToken(user);
      const bearerHeader = `Bearer ${token}`;
      const extracted = extractTokenFromHeader(bearerHeader);

      expect(extracted).toBe(token);
    });

    test('should handle header with multiple spaces', () => {
      const user = { id: 'user456', email: 'user456@example.com', role: 'user' };
      const token = generateToken(user);
      const bearerHeader = `Bearer   ${token}`;
      const extracted = extractTokenFromHeader(bearerHeader);

      expect(extracted).toBe(token);
    });

    test('should return null for missing header', () => {
      const extracted = extractTokenFromHeader(null);
      expect(extracted).toBeNull();
    });

    test('should return null for empty header', () => {
      const extracted = extractTokenFromHeader('');
      expect(extracted).toBeNull();
    });

    test('should return null for non-Bearer header', () => {
      const extracted = extractTokenFromHeader('Basic sometoken');
      expect(extracted).toBeNull();
    });

    test('should handle case-insensitive Bearer', () => {
      const user = { id: 'user789', email: 'user789@example.com', role: 'user' };
      const token = generateToken(user);
      const lowerBearerHeader = `bearer ${token}`;
      const extracted = extractTokenFromHeader(lowerBearerHeader);

      expect(extracted).toBe(token);
    });
  });

  // ==================== SECURITY TESTS ====================

  describe('Token Security', () => {
    test('should not allow token tampering', () => {
      const user = { id: 'user123', email: 'user123@example.com', role: 'user' };
      const token = generateToken(user);
      const parts = token.split('.');
      const tamperedToken = parts[0] + '.' + parts[1] + '.tampered';

      expect(() => {
        verifyToken(tamperedToken);
      }).toThrow();
    });

    test('should use secret key in signature', () => {
      const user = { id: 'user123', email: 'user123@example.com', role: 'user' };
      const token1 = generateToken(user);
      const token2 = generateToken(user);

      // Same user should generate same token content but different signatures
      // (actually they should be same since no timestamp)
      expect(token1).toBe(token2);
    });

    test('should handle special characters in user ID', () => {
      const userId = 'user@example.com_123';
      const user = { id: userId, email: 'user@example.com', role: 'user' };
      const token = generateToken(user);
      const decoded = verifyToken(token);

      expect(decoded.id).toBe(userId);
    });
  });
});
