import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import store from './store';
import App from './App.tsx';

// <PersistGate loading={null} persistor={persistor}><App /></PersistGate>
ReactDOM.createRoot(document.getElementById('root')!).render(<Provider store={store}><App /></Provider>,);
