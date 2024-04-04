import { useContext } from 'react';
import { DatabaseDataContext } from '../context/DatabaseContext'; // Ensure this path is correct

export const useDatabaseContext = () => useContext(DatabaseDataContext);
