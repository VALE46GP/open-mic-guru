import React from 'react';
import { Navbar, Nav } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Navigation.sass';

const Navigation = () => {
    const { getUserId, isAuthenticated, userName } = useAuth();
    const userId = getUserId();

    return (
        <Navbar bg="light" expand="lg" className="w-100">
            <Navbar.Brand as={Link} to="/">Open Mic Guru</Navbar.Brand>
            <Navbar.Toggle aria-controls="basic-navbar-nav"/>
            <Navbar.Collapse id="basic-navbar-nav">
                <Nav className="me-auto">
                    <Nav.Link as={Link} to="/testdb">Test Database</Nav.Link>
                    <Nav.Link as={Link} to="/events">Events</Nav.Link>
                    <Nav.Link as={Link} to="/create-event">Create Event</Nav.Link>
                    {!isAuthenticated && (
                        <Nav.Link as={Link} to="/login">Login</Nav.Link>
                    )}
                </Nav>
                {isAuthenticated && (
                    <Nav className="ms-auto">
                        <Nav.Link as={Link} to={`/users/${userId}`}>{userName}</Nav.Link>
                    </Nav>
                )}
            </Navbar.Collapse>
        </Navbar>
    );
};

export default Navigation;