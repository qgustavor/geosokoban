import { createRouter, createWebHashHistory } from 'vue-router'
import { guardedPuzzleLocation } from './locations.js'
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

    const destination = guardedPuzzleLocation(to.params.code, to.query.g)
    if (destination.name === 'home') return { ...destination, replace: true }

    const needsCanonicalLocation = to.params.code !== destination.params.code ||
      JSON.stringify(to.query) !== JSON.stringify(destination.query)
    if (needsCanonicalLocation) return { ...destination, replace: true }

    return true
  })

  return router
}
