import { HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, from, switchMap, throwError } from 'rxjs';

/** Blob válaszú kérés hibájának JSON-törzsét (ApiResponse) visszaalakítja, hogy az üzenet olvasható legyen. */
export async function blobErrorAsJson(error: unknown): Promise<unknown> {
  if (!(error instanceof HttpErrorResponse) || !(error.error instanceof Blob)) return error;
  try {
    const body: unknown = JSON.parse(await error.error.text());
    return new HttpErrorResponse({
      error: body,
      headers: error.headers,
      status: error.status,
      statusText: error.statusText,
      url: error.url ?? undefined,
    });
  } catch {
    return error;
  }
}

/** Blob kérésre: hiba esetén a backend üzenete a szokásos {@code error.error.message} helyen érkezik. */
export function withJsonErrors<T>(source: Observable<T>): Observable<T> {
  return source.pipe(catchError((error: unknown) => from(blobErrorAsJson(error)).pipe(switchMap((parsed) => throwError(() => parsed)))));
}
