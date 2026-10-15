import { expect, type Locator } from '@playwright/test';

/**
 * A kereshető app-select (Angular Material autocomplete) nem natív <select>, ezért a
 * selectOption() nem működik rajta. Ugyanúgy választunk, ahogy egy felhasználó:
 * rákattintunk, beírjuk a keresett szöveget, és a listából a pontos opcióra kattintunk.
 */
export async function chooseSearchableOption(combobox: Locator, label: string): Promise<void> {
  // A nem kereshető app-select natív <select> marad.
  if (await combobox.evaluate(el => el.tagName === 'SELECT')) {
    await combobox.selectOption({ label });
    return;
  }
  await combobox.click();
  await combobox.fill(label);
  const option = combobox.page().getByRole('option', { name: label, exact: true });
  await expect(option).toBeVisible();
  await option.click();
  await expect(combobox).toHaveValue(label);
}

/** A kiválasztás törlése: üres keresésnél a lista első eleme a helykitöltő (üres) opció. */
export async function clearSearchableOption(combobox: Locator, placeholder: string | RegExp): Promise<void> {
  await combobox.click();
  await combobox.fill('');
  const option = combobox.page().getByRole('option', { name: placeholder });
  await expect(option).toBeVisible();
  await option.click();
}
