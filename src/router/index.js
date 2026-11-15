import { createRouter, createWebHashHistory } from 'vue-router'
import { normalizeCode } from '../core/seed.js'
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
    scrollBehavior: (to, from, savedPosition) => savedPosition ?? (to.path === from.path ? undefined : { top: 0 })
  })
  router.beforeEach(to => {
    if (to.name !== 'puzzle') return true
    const code = normalizeCode(to.params.code)
    if (code && (to.params.code !== code || !['learn', 'remember'].includes(to.query.g) || code.endsWith('-P') && to.query.g !== 'remember')) {
      return { ...puzzleLocation(code, to.query.g), replace: true }
    }
    return true
  })
  return router
}
