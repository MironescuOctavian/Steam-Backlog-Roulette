import {test} from 'node:test';
import assert from 'node:assert/strict';
import {priceCents,calculatorSummary,backlogRoast} from '../src/calculator-model.ts';

test('calculator uses current USD prices, excludes unknowns, and counts less than five minutes as unplayed',()=>{
  const price=(value,free=false)=>({price:value,free});
  assert.equal(priceCents(price('$1,234.56')),123456);
  assert.equal(priceCents(price('$0.99')),99);
  for(const invalid of ['€9.99','$1.2','$1,23.45','Free'])assert.equal(priceCents(price(invalid)),null);
  assert.equal(priceCents(price(null,true)),0);
  assert.equal(priceCents(undefined),null);
  const games=[{appId:1,playtimeHours:4/60},{appId:2,playtimeHours:5/60},{appId:3,playtimeHours:2},{appId:4,playtimeHours:0}];
  assert.deepEqual(calculatorSummary(games,{1:price('$19.99'),2:price('$10.00'),3:price(null,true)}),{value:2999,unplayedValue:1999,priced:3,hours:2+9/60,unplayed:2,total:4});
  assert.deepEqual(calculatorSummary([],{}),{value:0,unplayedValue:0,priced:0,hours:0,unplayed:0,total:0});
  assert.match(backlogRoast(10,8),/8 unplayed/);assert.match(backlogRoast(0,0),/empty library/);
});
