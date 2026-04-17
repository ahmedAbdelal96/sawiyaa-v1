import { useQuery } from "@tanstack/react-query";

import { profileService } from "@/modules/profile/application/profile.service";

export function useProfile() {
  return useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => profileService.getCurrentProfile(),
  });
}
