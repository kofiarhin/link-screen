import { useQuery } from '@tanstack/react-query';
import { getSession } from '../../services/sessionService';

export function useSession(id) {
  return useQuery({
    queryKey: ['session', id],
    queryFn: () => getSession(id),
    retry: false,
    enabled: !!id,
  });
}
