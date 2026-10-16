import { test, expect, openClient, fixtureSets, dbOne, closeDb } from '../../helpers/coach-workspace-fixture';
import { reportSelect } from '../../helpers/select-report';

test.afterAll(closeDb);
const sql=`SELECT s.id,s.set_number,s.target_weight_kg::text AS target_weight_kg,
 s.actual_weight_kg::text AS actual_weight_kg,s.target_repetitions,s.actual_repetitions
 FROM user_workout_exercise_sets s WHERE s.id=$1`;
test('COACH: edzésterv cél- és tényleges súly módosítása → PostgreSQL SELECT',async({page,workspace:f})=>{
  const sets=await fixtureSets(f);
  const id=Number(sets[0].id);
  await openClient(page,f);
  const root=page.locator('app-coach-client-detail');
  await root.getByRole('spinbutton',{name:/1\. Cél súly \(kg\)$/}).first().fill('42.5');
  await root.getByRole('spinbutton',{name:/1\. Tény\. súly \(kg\)$/}).first().fill('40');
  await root.getByRole('button',{name:'Mentés (1)',exact:true}).click();
  await expect(root.getByRole('button',{name:'Mentés (0)',exact:true})).toBeDisabled();
  const expected={target_weight_kg:'42.50',actual_weight_kg:'40.00'};
  const stored=await dbOne<any>(sql,[id]);
  await reportSelect('plan-weight-update',sql,{id,...expected},stored);
  expect(stored).toMatchObject({id,...expected});
  await page.reload();
  await expect(root.getByRole('spinbutton',{name:/1\. Cél súly \(kg\)$/}).first()).toHaveValue('42.5');
  await expect(root.getByRole('spinbutton',{name:/1\. Tény\. súly \(kg\)$/}).first()).toHaveValue('40');
  // workspace fixture owns this workout, it is cleaned up after test.
});
