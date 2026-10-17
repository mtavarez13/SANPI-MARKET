import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rolePanelTheme, ROLE_PANEL_THEME } from '../src/lib/rolePanelTheme.ts';

test('every operational role has a named panel and customers have none', () => {
  assert.deepEqual(Object.keys(ROLE_PANEL_THEME).sort(), ['admin', 'carrier', 'dropshipper', 'partner', 'supplier']);
  for (const role of Object.keys(ROLE_PANEL_THEME)) {
    assert.ok(rolePanelTheme(role)?.label);
    assert.ok(rolePanelTheme(role)?.area);
  }
  assert.equal(rolePanelTheme('customer'), null);
  assert.equal(rolePanelTheme(null), null);
});
