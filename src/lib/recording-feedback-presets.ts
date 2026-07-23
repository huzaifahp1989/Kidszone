import { RECORDING_APPROVED_POINTS } from '@/lib/points-policy';

export type RecordingApprovePreset = {
  id: string;
  label: string;
  points: number;
  feedback: string;
  publish: boolean;
};

export type RecordingRejectPreset = {
  id: string;
  label: string;
  feedback: string;
};

export const RECORDING_APPROVE_PRESETS: RecordingApprovePreset[] = [
  {
    id: 'great',
    label: `Great recitation (+${RECORDING_APPROVED_POINTS})`,
    points: RECORDING_APPROVED_POINTS,
    feedback: 'MashaAllah! Beautiful recitation. Keep practising!',
    publish: true,
  },
  {
    id: 'good',
    label: `Good effort (+${RECORDING_APPROVED_POINTS})`,
    points: RECORDING_APPROVED_POINTS,
    feedback: 'Well done! Good effort — keep going!',
    publish: true,
  },
  {
    id: 'excellent-story',
    label: `Excellent story (+${RECORDING_APPROVED_POINTS})`,
    points: RECORDING_APPROVED_POINTS,
    feedback: 'Excellent storytelling! Your voice was clear and engaging.',
    publish: true,
  },
  {
    id: 'bonus',
    label: `Outstanding (+${RECORDING_APPROVED_POINTS})`,
    points: RECORDING_APPROVED_POINTS,
    feedback: 'Outstanding work! This recording really stood out.',
    publish: true,
  },
];

export const RECORDING_REJECT_PRESETS: RecordingRejectPreset[] = [
  {
    id: 'quiet',
    label: 'Too quiet',
    feedback: 'Please try again — speak a little louder so we can hear you clearly.',
  },
  {
    id: 'background',
    label: 'Background noise',
    feedback: 'There was too much background noise. Please record in a quieter place and try again.',
  },
  {
    id: 'incomplete',
    label: 'Incomplete',
    feedback: 'This recording seems incomplete. Please record the full passage and submit again.',
  },
  {
    id: 'wrong-content',
    label: 'Wrong content',
    feedback: 'This does not match the requested content. Please check the instructions and try again.',
  },
];
