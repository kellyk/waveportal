import * as React from "react";
import { ethers } from "ethers";
import './App.css';
import abi from './utils/WavePortal.json';
import loading from './loading.svg';
import date from 'date-and-time';

const contractAddress = '0x1084af846d4eE693Ee4426a07Ef06730f6C1E9c1';
const contractABI = abi.abi;

function formatDate(dateString) {
  const messageDate = new Date(dateString);
  return date.format(messageDate, "MMM DD, YYYY, h:MM A");
}

function formatAddress(str) {
  const first = str.substring(0, 7);
  const last = str.substring(str.length - 7);
  const url = `https://rinkeby.etherscan.io/address/${str}`;
  const formatted = first + '....' + last;
  return <a target="_blank" rel="noopener noreferrer" href={url}>{formatted}</a>;
}

function reverseChronSort(a, b) {
  const dateA = new Date(a.timestamp).getTime();
  const dateB = new Date(b.timestamp).getTime();
  return dateB - dateA;
}

export default function App() {
  const [allWaves, setAllWaves] = React.useState([]);
  const [currAccount, setCurrAccount] = React.useState('');
  const [isWaving, setIsWaving] = React.useState(false);
  const [waveCount, setWaveCount] = React.useState(0);
  const [message, setMessage] = React.useState();

  const connectAccount = () => {
    const { ethereum } = window;
    if (!ethereum) {
      alert('Get metamask!');
      return;
    }

    ethereum.request({ method: 'eth_requestAccounts'})
    .then(accounts => {
      console.log('Connected!', accounts[0]);
      setCurrAccount(accounts[0]);
      getWaveCount();
      getAllWaves();
    });
  };

  const getWaveCount = async () => {
    if (window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const wavePortalContract = new ethers.Contract(contractAddress, contractABI, signer);

      const count = await wavePortalContract.getTotalWaves();
      setWaveCount(count.toNumber());
    } else {
      console.log("Ethereum object doesn't exist!")
    }
  };

  const getAllWaves = async () => {
    try {
      if (window.ethereum) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const wavePortalContract = new ethers.Contract(contractAddress, contractABI, signer);

        const waves = await wavePortalContract.getAllWaves();

        let wavesCleaned = [];
        waves.forEach(wave => {
          wavesCleaned.push({
            address: wave.waver,
            timestamp: new Date(wave.timestamp * 1000),
            message: wave.message
          });
        });
        setAllWaves(wavesCleaned);

        wavePortalContract.on("NewWave", (from, timestamp, message) => {
          console.log("NewWave", from, timestamp, message);

          setAllWaves(prevState => [...prevState, {
            address: from,
            timestamp: new Date(timestamp * 1000),
            message: message
          }]);
        });
      } else {
        console.log("Ethereum object doesn't exist!")
      }
    } catch (error) {
      console.log(error);
    }
  }

  const wave = async () => {
    setIsWaving(true);
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const wavePortalContract = new ethers.Contract(contractAddress, contractABI, signer);
      let count = await (wavePortalContract.getTotalWaves());
      console.log('Received user wave count: ', count.toNumber());
      setWaveCount(count.toNumber());

      const waveTxn = await wavePortalContract.wave(message);
      console.log('Minting...', waveTxn.hash);

      await waveTxn.wait();
      console.log('Mined --', waveTxn.hash);

      count = await (wavePortalContract.getTotalWaves());
      console.log('Received user wave count: ', count.toNumber());
      setIsWaving(false);
      setWaveCount( count.toNumber());
      setMessage();
    } catch (error) {
      console.log(error.message);
      setIsWaving(false);
    }
  };

  const onMessageChange = (e) => {
    setMessage(e.target.value);
  };

  const renderConnectButton = () => (
    <button className="waveButton" onClick={connectAccount}>
      Connect Metamask
    </button>
  );

  const renderWaveForm = () => (
    <div>
      { !isWaving ? (
        <div className="waveForm">
          <input className="waveInput" type="text" onChange={onMessageChange}/>
          <button className="waveButton" onClick={wave} disabled={isWaving}>
            Wave at me
          </button>
        </div>
      ) : (
        <div className="loadingImage">
          <img src={loading} alt="Loading spinner" />
        </div>
        )
      }
    </div>
  );

  React.useEffect(() => {
    const checkIfWalletIsConnected = () => {
    const { ethereum } = window;
    if (!ethereum) {
      console.log('Make sure you have metamask!');
      return;
    } else {
      console.log('We have the ethereum object!', ethereum);
    }

    ethereum.request({ method: 'eth_accounts'})
      .then(accounts => {
        if (accounts.length) {
          const account = accounts[0];
          setCurrAccount(account);
          console.log('Found an authorized account: ', account);
          getWaveCount();
          getAllWaves();
        } else {
          console.log('No authorized account found.');
        }
      });
    };

    checkIfWalletIsConnected();
  }, []);


  return (
    <div className="mainContainer">
      <div className="dataContainer">
        <div className="header">
        👋 Hey there!
        </div>

        <div className="bio">
          I'm <a style={{ textDecoration:"underline" }} href="https://twitter.com/kng">Kelly</a>. Connect your Ethereum wallet and wave at me!
        </div>

        { !currAccount ? renderConnectButton() : renderWaveForm() }

        { allWaves.length ? (
          <div className="waveList">
              {allWaves.sort(reverseChronSort).map((wave, index) => {
                return (
                  <div className="wave">
                    <span className="waveAddress">{formatAddress(wave.address)}</span>&middot;
                    <span className="waveDate">{formatDate(wave.timestamp.toString())}</span>
                    <div className="waveMessage">{wave.message}</div>
                  </div>)
              })}
            </div>
          ) : null
        }

        { waveCount ? (
          <div className="waveCount">Total waves: {waveCount}</div>
         ) : null
        }
      </div>
    </div>
  );
}
