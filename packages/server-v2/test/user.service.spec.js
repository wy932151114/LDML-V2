"use strict";
// ============================================================
// DZS-OS V2 — User 模块单元测试
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
var common_1 = require("@nestjs/common");
var user_service_1 = require("../src/modules/user/domain/user.service");
var user_schema_1 = require("../src/database/mongoose/schemas/user.schema");
describe('UserService', function () {
    var userService;
    var userModel;
    var mockUserId = '507f1f77bcf86cd799439011';
    var mockUser = {
        _id: mockUserId,
        email: 'test@example.com',
        phone: null,
        nickname: 'TestUser',
        avatarUrl: null,
        role: 'user',
        membershipLevel: 'none',
        isGuest: false,
        isVerified: false,
        emailVerified: false,
        phoneVerified: false,
        profile: {
            realName: '',
            gender: '',
            birthday: '',
            bio: '',
            timezone: 'Asia/Shanghai',
            language: 'zh-CN',
            theme: 'light',
        },
        preferences: {},
        lastLoginAt: null,
        createdAt: new Date('2024-01-01'),
    };
    beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
        var module;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, testing_1.Test.createTestingModule({
                        providers: [
                            user_service_1.UserService,
                            {
                                provide: (0, mongoose_1.getModelToken)(user_schema_1.User.name),
                                useValue: {
                                    findById: jest.fn(),
                                    findByIdAndUpdate: jest.fn(),
                                    find: jest.fn(),
                                    countDocuments: jest.fn(),
                                },
                            },
                        ],
                    }).compile()];
                case 1:
                    module = _a.sent();
                    userService = module.get(user_service_1.UserService);
                    userModel = module.get((0, mongoose_1.getModelToken)(user_schema_1.User.name));
                    return [2 /*return*/];
            }
        });
    }); });
    describe('getProfile', function () {
        it('should return user profile', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Arrange
                        jest.spyOn(userModel, 'findById').mockReturnValue({
                            exec: jest.fn().mockResolvedValue(mockUser),
                        });
                        return [4 /*yield*/, userService.getProfile(mockUserId)];
                    case 1:
                        result = _a.sent();
                        // Assert
                        expect(result).toBeDefined();
                        expect(result.id).toBe(mockUserId);
                        expect(result.email).toBe('test@example.com');
                        expect(result.nickname).toBe('TestUser');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should throw NotFoundException when user does not exist', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Arrange
                        jest.spyOn(userModel, 'findById').mockReturnValue({
                            exec: jest.fn().mockResolvedValue(null),
                        });
                        // Act & Assert
                        return [4 /*yield*/, expect(userService.getProfile('nonexistent-id')).rejects.toThrow(common_1.NotFoundException)];
                    case 1:
                        // Act & Assert
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('updateProfile', function () {
        it('should update user profile', function () { return __awaiter(void 0, void 0, void 0, function () {
            var updatedUser, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        updatedUser = __assign(__assign({}, mockUser), { nickname: 'UpdatedNickname', profile: __assign(__assign({}, mockUser.profile), { gender: '男' }) });
                        jest.spyOn(userModel, 'findByIdAndUpdate').mockReturnValue({
                            exec: jest.fn().mockResolvedValue(updatedUser),
                        });
                        return [4 /*yield*/, userService.updateProfile(mockUserId, {
                                nickname: 'UpdatedNickname',
                                gender: '男',
                            })];
                    case 1:
                        result = _a.sent();
                        // Assert
                        expect(result).toBeDefined();
                        expect(result.nickname).toBe('UpdatedNickname');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should throw NotFoundException when user not found', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Arrange
                        jest.spyOn(userModel, 'findByIdAndUpdate').mockReturnValue({
                            exec: jest.fn().mockResolvedValue(null),
                        });
                        // Act & Assert
                        return [4 /*yield*/, expect(userService.updateProfile('nonexistent-id', { nickname: 'New' })).rejects.toThrow(common_1.NotFoundException)];
                    case 1:
                        // Act & Assert
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('updateAvatar', function () {
        it('should update avatar URL', function () { return __awaiter(void 0, void 0, void 0, function () {
            var newAvatarUrl, updatedUser, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        newAvatarUrl = 'https://example.com/avatar.jpg';
                        updatedUser = __assign(__assign({}, mockUser), { avatarUrl: newAvatarUrl });
                        jest.spyOn(userModel, 'findByIdAndUpdate').mockReturnValue({
                            exec: jest.fn().mockResolvedValue(updatedUser),
                        });
                        return [4 /*yield*/, userService.updateAvatar(mockUserId, newAvatarUrl)];
                    case 1:
                        result = _a.sent();
                        // Assert
                        expect(result).toBeDefined();
                        expect(result.avatarUrl).toBe(newAvatarUrl);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should throw NotFoundException when user not found', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        jest.spyOn(userModel, 'findByIdAndUpdate').mockReturnValue({
                            exec: jest.fn().mockResolvedValue(null),
                        });
                        return [4 /*yield*/, expect(userService.updateAvatar('nonexistent-id', 'https://example.com/avatar.jpg')).rejects.toThrow(common_1.NotFoundException)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('getPreferences', function () {
        it('should return user preferences', function () { return __awaiter(void 0, void 0, void 0, function () {
            var userWithPrefs, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        userWithPrefs = __assign(__assign({}, mockUser), { preferences: { theme: 'dark', language: 'en' } });
                        jest.spyOn(userModel, 'findById').mockReturnValue({
                            exec: jest.fn().mockResolvedValue(userWithPrefs),
                        });
                        return [4 /*yield*/, userService.getPreferences(mockUserId)];
                    case 1:
                        result = _a.sent();
                        // Assert
                        expect(result).toEqual({ theme: 'dark', language: 'en' });
                        return [2 /*return*/];
                }
            });
        }); });
        it('should return empty object when no preferences', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        jest.spyOn(userModel, 'findById').mockReturnValue({
                            exec: jest.fn().mockResolvedValue(mockUser),
                        });
                        return [4 /*yield*/, userService.getPreferences(mockUserId)];
                    case 1:
                        result = _a.sent();
                        expect(result).toEqual({});
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('updatePreferences', function () {
        it('should update user preferences', function () { return __awaiter(void 0, void 0, void 0, function () {
            var newPrefs, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        newPrefs = { theme: 'dark', language: 'en' };
                        jest.spyOn(userModel, 'findByIdAndUpdate').mockReturnValue({
                            exec: jest.fn().mockResolvedValue(__assign(__assign({}, mockUser), { preferences: newPrefs })),
                        });
                        return [4 /*yield*/, userService.updatePreferences(mockUserId, newPrefs)];
                    case 1:
                        result = _a.sent();
                        // Assert
                        expect(result).toEqual(newPrefs);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('getUsers', function () {
        it('should return paginated users list', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Arrange
                        jest.spyOn(userModel, 'find').mockReturnValue({
                            sort: jest.fn().mockReturnThis(),
                            skip: jest.fn().mockReturnThis(),
                            limit: jest.fn().mockReturnThis(),
                            exec: jest.fn().mockResolvedValue([mockUser, mockUser]),
                        });
                        jest.spyOn(userModel, 'countDocuments').mockReturnValue({
                            exec: jest.fn().mockResolvedValue(10),
                        });
                        return [4 /*yield*/, userService.getUsers(1, 20)];
                    case 1:
                        result = _a.sent();
                        // Assert
                        expect(result.items).toHaveLength(2);
                        expect(result.total).toBe(10);
                        expect(result.page).toBe(1);
                        expect(result.limit).toBe(20);
                        expect(result.totalPages).toBe(1);
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
