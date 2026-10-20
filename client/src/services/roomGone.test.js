// Testes da saída de sala apagada. Rodar com: npm test
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { DELETED_PATH, isRoomGone, leaveDeletedRoom } from './roomGone.js'

describe('sala apagada', () => {
  it('personagem ou sala que não existe mais, nas rotas do jogador', () => {
    assert.equal(isRoomGone(404, '/characters/abc', 'Personagem não encontrado'), true)
    assert.equal(isRoomGone(404, 'characters/abc/ready', 'Personagem não encontrado'), true)
    assert.equal(isRoomGone(404, '/rooms/r1/standing', 'Sala não encontrada'), true)
  })
  it('outros erros não tiram ninguém da sala', () => {
    assert.equal(isRoomGone(500, '/characters/abc', 'Personagem não encontrado'), false)
    assert.equal(isRoomGone(404, '/characters/abc/dilemma', 'Dilema não encontrado'), false)
    assert.equal(isRoomGone(404, '/rooms/r1/progress', 'Sala não encontrada'), false) // painel do professor
    assert.equal(isRoomGone(404, '/rooms/r1', 'Sala não encontrada'), false)
  })
  const fakeStore = () => {
    const state = { character: { id: 'c' }, room: { id: 'r' } }
    state.setCharacter = (v) => { state.character = v }
    state.setRoom = (v) => { state.room = v }
    return { state, getState: () => state }
  }
  it('esquece o personagem e vai para a criação', () => {
    const store = fakeStore(), loc = { pathname: '/map', href: '/map' }
    leaveDeletedRoom(store, loc)
    assert.equal(store.state.character, null)
    assert.equal(store.state.room, null)
    assert.equal(loc.href, DELETED_PATH)
  })
  it('quem já está na criação ou no painel não é redirecionado', () => {
    for (const pathname of ['/character', '/admin']) {
      const loc = { pathname, href: pathname }
      leaveDeletedRoom(fakeStore(), loc)
      assert.equal(loc.href, pathname)
    }
  })
})
