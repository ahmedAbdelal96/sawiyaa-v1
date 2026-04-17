import { getCurrentPatientProfileRequest } from "@/modules/profile/api/profile.api";

export const profileService = {
  async getCurrentProfile() {
    const response = await getCurrentPatientProfileRequest();
    return response.profile;
  },
};
