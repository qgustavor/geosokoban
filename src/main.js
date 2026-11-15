import { createApp } from 'vue'
import App from './ui/App.vue'
import { createAppRouter } from './router/index.js'
import './style.css'

createApp(App).use(createAppRouter()).mount('#app')
