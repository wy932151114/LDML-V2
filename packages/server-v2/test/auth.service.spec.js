"use strict";
// ============================================================
// DZS-OS V2 — Auth 模块单元测试
// ============================================================
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var testing_1 = require("@nestjs/testing");
var mongoose_1 = require("@nestjs/mongoose");
var jwt_1 = require("@nestjs/jwt");
var config_1 = require("@nestjs/config");
var common_1 = require("@nestjs/common");
var bcrypt = require("bcryptjs");
var auth_service_1 = require("../src/modules/auth/domain/auth.service");
var user_schema_1 = require("../src/database/mongoose/schemas/user.schema");
var session_schema_1 = require("../src/database/mongoose/schemas/session.schema");
var redis_service_1 = require("../src/database/redis/redis.service");
describe('AuthService', function () {
    var authService;
    var userModel;
    var sessionModel;
    var jwtService;
    var mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        passwordHash: '$2a$12$hashedpassword',
        nickname: 'TestUser',
        role: 'user',
        isGuest: false,
        isVerified: false,
        emailVerified: false,
        phoneVerified: false,
        isActive: true,
        membershipLevel: 'none',
        avatarUrl: null,
        phone: null,
        profile: {},
        preferences: {},
        refreshTokens: [],
        lastLoginAt: null,
        createdAt: new Date('2024-01-01'),
        save: jest.fn().mockResolvedValue(true),
    };
    var mockSession = {
        _id: 'session123',
        userId: mockUser._id,
        refreshToken: 'refresh-token-123',
        accessToken: 'access-token-123',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
    beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
        var module;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, testing_1.Test.createTestingModule({
                        providers: [
                            auth_service_1.AuthService,
                            {
                                provide: (0, mongoose_1.getModelToken)(user_schema_1.User.name),
                                useValue: {
                                    create: jest.fn(),
                                    findOne: jest.fn(),
                                    findById: jest.fn(),
                                    findByIdAndUpdate: jest.fn(),
                                },
                            },
                            {
                                provide: (0, mongoose_1.getModelToken)(session_schema_1.Session.name),
                                useValue: {
                                    create: jest.fn(),
                                    findOne: jest.fn(),
                                    findByIdAndUpdate: jest.fn(),
                                    updateOne: jest.fn(),
                                    updateMany: jest.fn(),
                                },
                            },
                            {
                                provide: jwt_1.JwtService,
                                useValue: {
                                    sign: jest.fn().mockReturnValue('access-token-123'),
                                    verify: jest.fn(),
                                },
                            },
                            {
                                provide: config_1.ConfigService,
                                useValue: {
                                    get: jest.fn(function (key, defaultValue) {
                                        var _a;
                                        var config = {
                                            JWT_ACCESS_EXPIRY: '15m',
                                            JWT_REFRESH_EXPIRY: '7d',
                                            JWT_SECRET: 'test-secret',
                                        };
                                        return (_a = config[key]) !== null && _a !== void 0 ? _a : defaultValue;
                                    }),
                                },
                            },
                            {
                                provide: redis_service_1.RedisService,
                                useValue: {
                                    incr: jest.fn().mockResolvedValue(1),
                                    expire: jest.fn().mockResolvedValue(true),
                                    set: jest.fn().mockResolvedValue(true),
                                    get: jest.fn().mockResolvedValue(null),
                                    del: jest.fn().mockResolvedValue(true),
                                },
                            },
                        ],
                    }).compile()];
                case 1:
                    module = _a.sent();
                    authService = module.get(auth_service_1.AuthService);
                    userModel = module.get((0, mongoose_1.getModelToken)(user_schema_1.User.name));
                    sessionModel = module.get((0, mongoose_1.getModelToken)(session_schema_1.Session.name));
                    jwtService = module.get(jwt_1.JwtService);
                    return [2 /*return*/];
            }
        });
    }); });
    describe('register', function () {
        it('should register a new user successfully', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Arrange
                        jest.spyOn(userModel, 'findOne').mockReturnValue({
                            exec: jest.fn().mockResolvedValue(null),
                        });
                        jest.spyOn(userModel, 'create').mockResolvedValue(__assign(__assign({}, mockUser), { toObject: function () { return mockUser; } }));
                        jest.spyOn(sessionModel, 'create').mockResolvedValue(mockSession);
                        return [4 /*yield*/, authService.register('new@example.com', 'password123', 'NewUser')];
                    case 1:
                        result = _a.sent();
                        // Assert
                        expect(result).toBeDefined();
                        expect(result.accessToken).toBe('access-token-123');
                        expect(result.refreshToken).toBe('refresh-token-123');
                        expect(result.user).toBeDefined();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should throw ConflictException when email already exists', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Arrange
                        jest.spyOn(userModel, 'findOne').mockReturnValue({
                            exec: jest.fn().mockResolvedValue(mockUser),
                        });
                        // Act & Assert
                        return [4 /*yield*/, expect(authService.register('existing@example.com', 'password123', 'DupUser')).rejects.toThrow(common_1.ConflictException)];
                    case 1:
                        // Act & Assert
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('login', function () {
        it('should login successfully with valid credentials', function () { return __awaiter(void 0, void 0, void 0, function () {
            var selectMock, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        selectMock = jest.fn().mockResolvedValue(mockUser);
                        jest.spyOn(userModel, 'findOne').mockReturnValue({
                            select: selectMock,
                        });
                        jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
                        jest.spyOn(sessionModel, 'create').mockResolvedValue(mockSession);
                        return [4 /*yield*/, authService.login('test@example.com', 'password123')];
                    case 1:
                        result = _a.sent();
                        // Assert
                        expect(result).toBeDefined();
                        expect(result.accessToken).toBe('access-token-123');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should throw UnauthorizedException for invalid password', function () { return __awaiter(void 0, void 0, void 0, function () {
            var selectMock;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        selectMock = jest.fn().mockResolvedValue(mockUser);
                        jest.spyOn(userModel, 'findOne').mockReturnValue({
                            select: selectMock,
                        });
                        jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);
                        // Act & Assert
                        return [4 /*yield*/, expect(authService.login('test@example.com', 'wrongpassword')).rejects.toThrow(common_1.UnauthorizedException)];
                    case 1:
                        // Act & Assert
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should throw UnauthorizedException when user not found', function () { return __awaiter(void 0, void 0, void 0, function () {
            var selectMock;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        selectMock = jest.fn().mockResolvedValue(null);
                        jest.spyOn(userModel, 'findOne').mockReturnValue({
                            select: selectMock,
                        });
                        // Act & Assert
                        return [4 /*yield*/, expect(authService.login('nonexistent@example.com', 'password123')).rejects.toThrow(common_1.UnauthorizedException)];
                    case 1:
                        // Act & Assert
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should throw UnauthorizedException for disabled account', function () { return __awaiter(void 0, void 0, void 0, function () {
            var disabledUser, selectMock;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        disabledUser = __assign(__assign({}, mockUser), { isActive: false });
                        selectMock = jest.fn().mockResolvedValue(disabledUser);
                        jest.spyOn(userModel, 'findOne').mockReturnValue({
                            select: selectMock,
                        });
                        jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
                        // Act & Assert
                        return [4 /*yield*/, expect(authService.login('disabled@example.com', 'password123')).rejects.toThrow(common_1.UnauthorizedException)];
                    case 1:
                        // Act & Assert
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('guestLogin', function () {
        it('should create a guest user successfully', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Arrange
                        jest.spyOn(userModel, 'create').mockResolvedValue(__assign(__assign({}, mockUser), { isGuest: true, role: 'guest', toObject: function () { return (__assign(__assign({}, mockUser), { isGuest: true, role: 'guest' })); } }));
                        jest.spyOn(sessionModel, 'create').mockResolvedValue(mockSession);
                        return [4 /*yield*/, authService.guestLogin()];
                    case 1:
                        result = _a.sent();
                        // Assert
                        expect(result).toBeDefined();
                        expect(result.accessToken).toBe('access-token-123');
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('refreshTokens', function () {
        it('should refresh tokens successfully', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Arrange
                        jest.spyOn(sessionModel, 'findOne').mockReturnValue({
                            exec: jest.fn().mockResolvedValue(mockSession),
                        });
                        jest.spyOn(userModel, 'findById').mockReturnValue({
                            exec: jest.fn().mockResolvedValue(mockUser),
                        });
                        jest.spyOn(sessionModel, 'findByIdAndUpdate').mockReturnValue({
                            exec: jest.fn().mockResolvedValue(mockSession),
                        });
                        jest.spyOn(sessionModel, 'create').mockResolvedValue(__assign(__assign({}, mockSession), { refreshToken: 'new-refresh-token' }));
                        return [4 /*yield*/, authService.refreshTokens('valid-refresh-token')];
                    case 1:
                        result = _a.sent();
                        // Assert
                        expect(result).toBeDefined();
                        expect(result.accessToken).toBe('access-token-123');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should throw UnauthorizedException for invalid refresh token', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Arrange
                        jest.spyOn(sessionModel, 'findOne').mockReturnValue({
                            exec: jest.fn().mockResolvedValue(null),
                        });
                        // Act & Assert
                        return [4 /*yield*/, expect(authService.refreshTokens('invalid-token')).rejects.toThrow(common_1.UnauthorizedException)];
                    case 1:
                        // Act & Assert
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('changePassword', function () {
        it('should change password successfully', function () { return __awaiter(void 0, void 0, void 0, function () {
            var selectMock;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        selectMock = jest.fn().mockResolvedValue(mockUser);
                        jest.spyOn(userModel, 'findById').mockReturnValue({
                            select: selectMock,
                        });
                        jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
                        jest.spyOn(bcrypt, 'hash').mockResolvedValue('$2a$12$newhash');
                        jest.spyOn(sessionModel, 'updateMany').mockReturnValue({
                            exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
                        });
                        // Act
                        return [4 /*yield*/, authService.changePassword(mockUser._id, 'oldPassword', 'newPassword123')];
                    case 1:
                        // Act
                        _a.sent();
                        // Assert
                        expect(mockUser.save).toHaveBeenCalled();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should throw UnauthorizedException when old password is wrong', function () { return __awaiter(void 0, void 0, void 0, function () {
            var selectMock;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        selectMock = jest.fn().mockResolvedValue(mockUser);
                        jest.spyOn(userModel, 'findById').mockReturnValue({
                            select: selectMock,
                        });
                        jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);
                        // Act & Assert
                        return [4 /*yield*/, expect(authService.changePassword(mockUser._id, 'wrongPassword', 'newPassword123')).rejects.toThrow(common_1.UnauthorizedException)];
                    case 1:
                        // Act & Assert
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('logout', function () {
        it('should logout and revoke all sessions', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Arrange
                        jest.spyOn(sessionModel, 'updateMany').mockReturnValue({
                            exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
                        });
                        // Act
                        return [4 /*yield*/, authService.logout(mockUser._id)];
                    case 1:
                        // Act
                        _a.sent();
                        // Assert
                        expect(sessionModel.updateMany).toHaveBeenCalledWith({ userId: mockUser._id, isRevoked: false }, { isRevoked: true });
                        return [2 /*return*/];
                }
            });
        }); });
        it('should logout and revoke specific session', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Arrange
                        jest.spyOn(sessionModel, 'updateOne').mockReturnValue({
                            exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
                        });
                        // Act
                        return [4 /*yield*/, authService.logout(mockUser._id, 'specific-refresh-token')];
                    case 1:
                        // Act
                        _a.sent();
                        // Assert
                        expect(sessionModel.updateOne).toHaveBeenCalledWith({ refreshToken: 'specific-refresh-token' }, { isRevoked: true });
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('sendEmailVerification', function () {
        it('should send verification code and return it in dev mode', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, authService.sendEmailVerification('test@example.com')];
                    case 1:
                        result = _a.sent();
                        // Assert
                        expect(result).toBeDefined();
                        expect(result.success).toBe(true);
                        expect(result.code).toBeDefined();
                        expect(result.code.length).toBe(6);
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
