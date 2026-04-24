import { useMutation } from '@tanstack/react-query';
import { createSession } from '../../services/sessionService';

export function useCreateSession() {
  return useMutation({ mutationFn: createSession });
}
