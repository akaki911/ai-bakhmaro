'use strict';

const { SUPER_ADMIN_PERSONAL_ID } = require('@ouranos/shared/gurulo-auth/gurulo.auth.js');

const defaultEmail = process.env.SUPER_ADMIN_EMAIL || 'super.admin@gurulo.ai';
const defaultDisplayName = process.env.SUPER_ADMIN_DISPLAY_NAME || 'Super Admin';
const defaultUserId = process.env.SUPER_ADMIN_USER_ID || SUPER_ADMIN_PERSONAL_ID;

class SuperAdminService {
  constructor() {
    this.profile = this.createProfile({
      userId: defaultUserId,
      personalId: SUPER_ADMIN_PERSONAL_ID,
      email: defaultEmail,
      displayName: defaultDisplayName,
      status: 'active',
    });
  }

  createProfile({ userId, personalId, email, displayName, status }) {
    const normalizedUserId = typeof userId === 'string' && userId.trim().length > 0
      ? userId.trim()
      : SUPER_ADMIN_PERSONAL_ID;

    const normalizedPersonalId = typeof personalId === 'string' && personalId.trim().length > 0
      ? personalId.trim()
      : SUPER_ADMIN_PERSONAL_ID;

    if (normalizedPersonalId !== SUPER_ADMIN_PERSONAL_ID) {
      throw new Error('Only the Gurulo Super Admin profile is supported');
    }

    return {
      id: normalizedUserId,
      userId: normalizedUserId,
      personalId: SUPER_ADMIN_PERSONAL_ID,
      role: 'SUPER_ADMIN',
      status: status || 'active',
      email: email && email.trim().length > 0 ? email.trim() : defaultEmail,
      displayName: displayName && displayName.trim().length > 0 ? displayName.trim() : defaultDisplayName,
      updatedAt: new Date().toISOString(),
      createdAt: this.profile?.createdAt || new Date().toISOString(),
    };
  }

  getProfileClone() {
    return { ...this.profile };
  }

  matchesKnownId(candidate) {
    if (!candidate || typeof candidate !== 'string') {
      return false;
    }
    const normalized = candidate.trim();
    return normalized === this.profile.userId ||
           normalized === this.profile.personalId ||
           normalized.toLowerCase() === this.profile.email.toLowerCase();
  }

  async createUser({ userId, personalId, email, role = 'SUPER_ADMIN', status = 'active', displayName }) {
    if (role !== 'SUPER_ADMIN') {
      throw new Error('Only SUPER_ADMIN role is supported in Gurulo AI Developer Space');
    }

    this.profile = {
      ...this.createProfile({ userId, personalId, email, displayName, status }),
      createdAt: this.profile?.createdAt || new Date().toISOString(),
    };

    console.log('👤 [SUPER ADMIN] Profile ensured for Gurulo operations', {
      userId: this.profile.userId,
      personalId: this.profile.personalId,
      email: this.profile.email,
    });

    return this.getProfileClone();
  }

  async getUser(userId) {
    if (!userId || this.matchesKnownId(userId)) {
      return this.getProfileClone();
    }
    return null;
  }

  async updateUserRole(userId, role) {
    if (!this.matchesKnownId(userId)) {
      throw new Error('Unknown user. Only the Gurulo Super Admin is available.');
    }
    if (role !== 'SUPER_ADMIN') {
      throw new Error('The Gurulo Super Admin role cannot be changed.');
    }
    return this.getProfileClone();
  }

  async getUsersByRole(role) {
    if (role !== 'SUPER_ADMIN') {
      return [];
    }
    return [this.getProfileClone()];
  }
}

module.exports = new SuperAdminService();
