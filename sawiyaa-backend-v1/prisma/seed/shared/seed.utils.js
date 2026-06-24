"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.daysAgo = daysAgo;
exports.daysFromNow = daysFromNow;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function hashPassword(plainText) {
    return bcryptjs_1.default.hash(plainText, 10);
}
function daysAgo(days) {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}
function daysFromNow(days) {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
//# sourceMappingURL=seed.utils.js.map