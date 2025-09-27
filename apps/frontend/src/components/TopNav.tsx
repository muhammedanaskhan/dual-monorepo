'use client';

import Link from 'next/link';
import { useIdentityToken, usePrivy } from '@privy-io/react-auth';
import Image from 'next/image';
import { useRef, useState } from 'react';

export const TopNav = () => {
    const { ready, authenticated, login, logout, getAccessToken } = usePrivy();
    const options = ['My Deck', 'Battle'];
    const [selected, setSelected] = useState<string>(options[0]);


    const { identityToken } = useIdentityToken();
    const firedRef = useRef(false);
    const identityTokenRef = useRef(identityToken);
    
    const loginCheck = async () => {

        // Prefer access token; fallback to ID token (backend supports both)
        const token = (await getAccessToken?.()) || (await identityTokenRef.current);
      
        if (!token) {
            window.alert('No token');
            return;
        };

        const base = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '');
        const url = `${base}/v1/auth/anonymous`;

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        console.log(res);
    }

    return (
        <nav className="flex justify-between items-center p-4 border-b">
            <div className="flex items-center gap-4">
                <Link href="/" className="flex items-center gap-2">
                    <Image src="/defi-logo.png" alt="logo" width={65} height={65} />
                </Link>

                <div className="flex rounded-[24px] overflow-hidden border h-12 p-1 bg-[#BDBDBD]">
                    {options.map((opt) => (
                        <button
                            key={opt}
                            onClick={() => setSelected(opt)}
                            aria-pressed={selected === opt}
                            className={
                                'px-3 py-1 text-sm ' +
                                (selected === opt
                                    ? 'bg-black text-white rounded-[24px]'
                                    : 'bg-transparent text-gray-600')
                            }
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            </div>

            {!ready ? (
                <button
                    className="px-3 py-1 rounded bg-gray-200 text-gray-600"
                    disabled
                >
                    Loading…
                </button>
            ) : authenticated ? (
                <button
                    onClick={() => logout()}
                    className="px-3 py-1 rounded bg-gray-900 text-white"
                >
                    Log out
                </button>
            ) : (
                <button
                    onClick={() => login()}
                    className="px-3 py-1 rounded-[24px] bg-gray-900 text-white "
                >
                    Connect
                </button>
            )}

            <button
                onClick={() => loginCheck()}
                className="px-3 py-1 rounded-[24px] bg-gray-900 text-white "
            >
                Check
            </button>
        </nav>
    );
};