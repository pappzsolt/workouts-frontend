/** Pontos megfelelője a backend dto.bugreport.* osztályainak. */
export type BugReporterType = 'USER' | 'COACH';

export interface BugReportScreenshot {
  id: number;
  position: number;
  contentType: 'image/png' | 'image/jpeg';
  width: number;
  height: number;
  sizeBytes: number;
}

export interface BugReportDto {
  id: number;
  reporterType: BugReporterType;
  reporterId: number | null;
  reporterName: string;
  reporterEmail: string | null;
  title: string;
  description: string;
  pageUrl: string | null;
  userAgent: string | null;
  createdAt: string;
  screenshots: BugReportScreenshot[];
}

export interface BugReportCreated {
  id: number;
  createdAt: string;
  screenshots: number;
}

export interface BugReportPayload {
  title: string;
  description: string;
  pageUrl: string | null;
  screenshots: File[];
}

/** Ugyanazok a korlátok, mint a backendben (BugReportService, ScreenshotSanitizer). */
export const BUG_REPORT_LIMITS = {
  titleMin: 3,
  titleMax: 150,
  descriptionMin: 10,
  descriptionMax: 5000,
  pageUrlMax: 500,
  maxScreenshots: 3,
  maxScreenshotBytes: 5 * 1024 * 1024,
} as const;
