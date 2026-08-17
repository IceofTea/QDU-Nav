/**
 * 应用入口：挂载根组件与全局样式
 */
import { createApp } from 'vue'
import App from './App.vue'
import './styles.css'

createApp(App).mount('#app')