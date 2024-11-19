import React, { useState } from 'react';
import { Navbar, Nav } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Navigation.sass';

const Navigation = () => {
    const { isAuthenticated, user } = useAuth();
    const [expanded, setExpanded] = useState(false);

    const handleToggle = () => setExpanded(!expanded);
    const handleClose = () => setExpanded(false);

    return (
        <Navbar bg="light" expand="lg" className="w-100" expanded={expanded}>
            <Navbar.Brand as={Link} to="/events">OMG</Navbar.Brand>
            <Navbar.Toggle aria-controls="basic-navbar-nav" onClick={handleToggle} />
            <Navbar.Collapse id="basic-navbar-nav">
                <Nav className="me-auto">
                    <Nav.Link as={Link} to="/testdb" onClick={handleClose}>Test Database</Nav.Link>
                    <Nav.Link as={Link} to="/events" onClick={handleClose}>Events</Nav.Link>
                    <Nav.Link as={Link} to="/create-event" onClick={handleClose}>Create Event</Nav.Link>
                    {!isAuthenticated && (
                        <Nav.Link as={Link} to="/login" onClick={handleClose}>Login</Nav.Link>
                    )}
                </Nav>
                {isAuthenticated && user && (
                    <Nav className="ms-auto">
                        <Nav.Link as={Link} to={`/users/${user.id}`} onClick={handleClose}>Account</Nav.Link>
                    </Nav>
                )}
            </Navbar.Collapse>
        </Navbar>
    );
};

export default Navigation;
