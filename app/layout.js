import './globals.css';

export const metadata = {
    title: 'FleetFlow — Fleet & Logistics Management',
    description: 'Modular Fleet & Logistics Management System for delivery fleet lifecycle, driver safety, and financial tracking.',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
