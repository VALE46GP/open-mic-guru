const TextInput = ({ value, onChange, placeholder, type = 'text' }) => (
    <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
    />
);

export default TextInput;
