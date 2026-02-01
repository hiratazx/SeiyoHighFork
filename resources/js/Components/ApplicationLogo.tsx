import { ImgHTMLAttributes } from 'react';

export default function ApplicationLogo(props: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img 
            {...props} 
            src="/images/AI-visual-novel-logo.png" 
            alt="AI Visual Novel Logo" 
        />
    );
}
