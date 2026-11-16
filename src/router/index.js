import { createRouter, createWebHashHistory } from 'vue-router'
import { normalizeCode, isPlanningCode } from '../core/seed.js'
import { puzzleLocation } from './locations.js'
import MenuPage from '../pages/MenuPage.vue'
import PuzzlePage from '../pages/PuzzlePage.vue'
import OptionsPage from '../pages/OptionsPage.vue'
import CreditsPage from '../pages/CreditsPage.vue'
import NotFoundPage from '../pages/NotFoundPage.vue'

export function createAppRouter () {
  const router = createRouter({
    // The default base preserves the deployed pathname, including a Pages repository subpath.
    history: createWebHashHistory(),
    routes: [
      { path: '/', name: 'home', component: MenuPage },
      { path: '/puzzle/:code', name: 'puzzle', component: PuzzlePage },
      { path: '/options', name: 'options', component: OptionsPage },
      { path: '/credits', name: 'credits', component: CreditsPage },
      { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundPage }
    ],
    scrollBehavior: (to, from, savedPosition) => {
      // Back/forward restoration takes priority, even when the route's path has not changed.
      if (savedPosition !== null && savedPosition !== undefined) return savedPosition

      // A query-only change, such as destination guidance, should not reset the scroll position.
      if (to.path === from.path) return undefined

      return { top: 0 }
    }
  })

  router.beforeEach(to => {
    if (to.name !== 'puzzle') return true

    const code = normalizeCode(to.params.code)

    // Let the puzzle view report invalid codes rather than replacing them with a different puzzle.
    if (!code) return true

    // The code selects the board; g controls destination visibility. Hard requires hidden targets.
    const needsCanonicalLocation = to.params.code !== code ||
      !['learn', 'remember'].includes(to.query.g) ||
      (isPlanningCode(code) && to.query.g !== 'remember')

    if (needsCanonicalLocation) {
      // Correct deep links without leaving an extra malformed entry in the browser's Back history.
      return { ...puzzleLocation(code, to.query.g), replace: true }
    }

    return true
  })

  return router
}
