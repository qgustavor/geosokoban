import { createApp } from 'vue'
import App from './ui/App.vue'
import { i18n } from './data/i18n.js'
import { createAppRouter } from './router/index.js'
import './style.css'

createApp(App).use(i18n).use(createAppRouter()).mount('#app')
