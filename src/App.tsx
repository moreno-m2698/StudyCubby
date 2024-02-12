import { useState } from "react";
import {Route, Routes, Link } from "react-router-dom";
import Upload from "./pages/Upload";
import Home from "./pages/Home";
import { VscThreeBars } from "react-icons/vsc"
import './CSS/app.css'

function App() {

    const [isNavbarActive, setIsNavbarActive] = useState(false);


    return (
        <>
            <header className="app__header">
                <button
                    id='menu-button'
                    aria-haspopup="true"
                    aria-expanded={`${isNavbarActive}`}
                    onClick={() => {setIsNavbarActive(!isNavbarActive); console.log(isNavbarActive);}}
                >
                    <VscThreeBars />
                </button>
                {/* think about how we will incorporate the app title */}
                <nav className="app__nav" aria-hidden='true'>
                    {/*ask zach why we can get away without a list and why use a over buttons */}
                    {/* links are automatically a tags */}
                    <Link to="/" className="route-sidebar-button" onClick={() => setIsNavbarActive(false)} aria-hidden='true'>
                        Home
                    </Link>
                    <Link to="/upload" className="route-sidebar-button" onClick={() => setIsNavbarActive(false)}  aria-hidden='true'>
                        Upload
                    </Link>
                </nav>
            </header>
            <main className="app__content">
                <Routes>
                    <Route path="/" element={<Home />}/>
                    <Route path="/upload" element={<Upload />}/>
                </Routes >
            </main>
            {/* maybe we lift up player so that u can technically listen to music even if the mode changes */}
        </>
    );

}

export default App;
