import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './CSS/index.css'
import { BrowserRouter } from 'react-router-dom'
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';

let myEnv = dotenv.config();
dotenvExpand.expand(myEnv);
console.log(process.env);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
    
  </React.StrictMode>,
)
