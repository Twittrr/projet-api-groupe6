/**
 * @file stories.test.js
 * @brief Regroupement du rail de stories : dédup par auteur, état "vu" (#11a).
 *        Le filtrage abonnés (#11b) se fait via la requête Mongo, testé en intégration.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupStories } from '../src/controllers/stories.controller.js';

const story = (authorId, viewedBy = []) => ({
  authorId,
  authorUsername: `u_${authorId}`,
  gradient: 'g',
  viewedBy,
});

test('une entrée par auteur, avec le compte des stories', () => {
  const groups = groupStories([story('a'), story('a'), story('b')], 'me');
  assert.equal(groups.length, 2);
  assert.equal(groups.find((g) => g.authorId === 'a').count, 2);
});

test('sa propre story est toujours "vue"', () => {
  const [g] = groupStories([story('me')], 'me');
  assert.equal(g.seen, true);
});

test('auteur "vu" seulement si TOUTES ses stories sont vues', () => {
  const allSeen = groupStories([story('a', ['me']), story('a', ['me'])], 'me');
  assert.equal(allSeen[0].seen, true);
  const oneUnseen = groupStories([story('a', ['me']), story('a', [])], 'me');
  assert.equal(oneUnseen[0].seen, false);
});

test('anonyme : rien n’est marqué "vu"', () => {
  const [g] = groupStories([story('a', ['x'])], null);
  assert.equal(g.seen, false);
});
