import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path ? 'active' : '';

    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <Link to="/">🍽️ MealsApp</Link>
            </div>
            <div className="navbar-links">
                <Link to="/" className={isActive('/')}>Home</Link>
                {user ? (
                    <>
                        <Link to="/profile" className={isActive('/profile')}>Profile</Link>
                        <button onClick={handleLogout} className="btn-logout">Logout</button>
                    </>
                ) : (
                    <>
                        <Link to="/login" className={isActive('/login')}>Login</Link>
                        <Link to="/signup" className={isActive('/signup')}>Sign Up</Link>
                    </>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
