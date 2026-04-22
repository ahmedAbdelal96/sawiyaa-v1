import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api';
import { 
  ListPublicPractitionersFilters, 
  PublicPractitionerDetailsResponse, 
  PublicPractitionersListResponse 
} from './types';

export const useGetPublicPractitioners = (filters: ListPublicPractitionersFilters) => {
  return useQuery({
    queryKey: ['public-practitioners', filters],
    queryFn: async () => {
      const response = await apiClient.get<PublicPractitionersListResponse>('/public/practitioners', {
        params: filters,
      });
      return response.data;
    },
  });
};

export const useGetPublicPractitionerDetails = (slug: string | null) => {
  return useQuery({
    queryKey: ['public-practitioner', slug],
    queryFn: async () => {
      const response = await apiClient.get<PublicPractitionerDetailsResponse>(`/public/practitioners/${slug}`);
      return response.data;
    },
    enabled: !!slug,
  });
};
