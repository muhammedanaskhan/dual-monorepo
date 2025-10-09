import { usePrivy } from "@privy-io/react-auth";

export const NotLoggedInHome = () => {

    const { login } = usePrivy();

    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <h1>press to start</h1>
            <button onClick={() => login()}>Connect</button>
        </div>
    );
};