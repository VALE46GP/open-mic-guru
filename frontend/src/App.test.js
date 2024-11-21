import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Open Mic Guru link', () => {
    render(<App/>);
    const linkElement = screen.getByText(/Open Mic Guru/i);
    expect(linkElement).toBeInTheDocument();
});
