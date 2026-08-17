import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerAxiosSyncInterceptors } from './lib/axiosSync.ts';
import { LocalStorageService } from './services/localStorageService.ts';

// Register sync interceptors to hook Axios requests to LocalStorage
registerAxiosSyncInterceptors();

// Bootstrap initial database from server into localStorage if empty
LocalStorageService.init();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
