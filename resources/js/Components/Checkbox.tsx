import { InputHTMLAttributes } from 'react';

export default function Checkbox({
    className = '',
    ...props
}: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            type="checkbox"
            className={
                'rounded border-white/20 bg-white/5 text-primary shadow-sm focus:ring-primary focus:ring-offset-background-dark ' +
                className
            }
        />
    );
}
