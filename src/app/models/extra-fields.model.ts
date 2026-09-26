export interface ExtraFields {
  [key: string]: string | number | undefined;

  coach_id?: number;
  gender?: string;
  weight?: number;
  age?: number;
  height?: number;
  goals?: string;
}
