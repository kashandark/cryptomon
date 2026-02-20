import { useState, useEffect } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  ArrowRightLeft, 
  ShieldCheck, 
  ExternalLink, 
  Coins, 
  ArrowUpRight,
  Settings,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  useAccount, 
  useConnect, 
  useDisconnect, 
  useBalance,
  useReadContracts,
  WagmiProvider 
} from 'wagmi';
import { formatUnits, parseAbi } from 'viem';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './WagmiConfig';
import axios from 'axios';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const queryClient = new QueryClient();

interface ExchangeRate {
  name: string;
  rate: number;
  fee: number;
}

const erc20Abi = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
]);

const SUPPORTED_TOKENS = [
  // Ethereum Mainnet
  { symbol: 'USDT', chainId: 1, address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' as `0x${string}`, icon: 'https://cryptologos.cc/logos/tether-usdt-logo.png' },
  { symbol: 'WBTC', chainId: 1, address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' as `0x${string}`, icon: 'https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.png' },
  
  // BNB Smart Chain (BSC)
  { symbol: 'SHIB', chainId: 56, address: '0x2859e4544C4bB03966803b044a93563Bd2D0DD4D' as `0x${string}`, icon: 'https://cryptologos.cc/logos/shiba-inu-shib-logo.png' },
  { symbol: 'BabyDoge', chainId: 56, address: '0xc748673057861a797275CD8A068AbB95A902e8de' as `0x${string}`, icon: 'https://cryptologos.cc/logos/baby-doge-coin-babydoge-logo.png' },
  { symbol: 'BTC', chainId: 56, address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c' as `0x${string}`, icon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png' },
  { symbol: 'USD.Z', chainId: 56, address: '0x...placeholder' as `0x${string}`, icon: 'https://picsum.photos/seed/usdz/200' },
  { symbol: 'LitterCoin', chainId: 56, address: '0x...placeholder' as `0x${string}`, icon: 'https://picsum.photos/seed/litter/200' },
];

function Dashboard() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });

  const currentChainTokens = SUPPORTED_TOKENS.filter(t => t.chainId === chainId);
  
  const tokenContracts = currentChainTokens.flatMap(token => [
    { address: token.address, abi: erc20Abi, functionName: 'balanceOf', args: [address] },
    { address: token.address, abi: erc20Abi, functionName: 'decimals' },
    { address: token.address, abi: erc20Abi, functionName: 'symbol' },
  ]);

  const { data: tokenData, isLoading: tokensLoading } = useReadContracts({
    contracts: address ? tokenContracts : [],
  });

  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [binanceWallet, setBinanceWallet] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [monetizing, setMonetizing] = useState(false);
  const [step, setStep] = useState<'idle' | 'comparing' | 'executing' | 'success'>('idle');
  const [monetizeAmount, setMonetizeAmount] = useState('1.0');
  const [assetSearch, setAssetSearch] = useState('');

  useEffect(() => {
    if (address) {
      fetchSettings();
    }
  }, [address]);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`/api/settings/${address}`);
      setBinanceWallet(res.data.binance_usdt_address || '');
    } catch (err) {
      console.error('Failed to fetch settings', err);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    setSettingsError(null);
    try {
      await axios.post('/api/settings', {
        wallet_address: address,
        binance_usdt_address: binanceWallet
      });
      setShowSettings(false);
    } catch (err: any) {
      console.error('Failed to save settings', err);
      setSettingsError(err.response?.data?.message || 'Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const fetchRates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/api/rates/ETH');
      setRates(res.data);
    } catch (err: any) {
      console.error('Failed to fetch rates', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch exchange rates. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMonetize = async () => {
    if (!binanceWallet) {
      setShowSettings(true);
      return;
    }
    setMonetizing(true);
    setStep('comparing');
    
    // We need to know if fetchRates succeeded
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/api/rates/ETH');
      setRates(res.data);
      
      // Only proceed if successful
      setTimeout(() => {
        setStep('executing');
        setTimeout(() => {
          setStep('success');
          setMonetizing(false);
        }, 3000);
      }, 2000);
    } catch (err: any) {
      console.error('Failed to fetch rates', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch exchange rates. Please check your connection and try again.');
      setMonetizing(false);
      setStep('idle');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(circle_at_50%_50%,_#1a1a2e_0%,_#0a0a0b_100%)]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full glass-card p-8 text-center space-y-8"
        >
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20">
              <TrendingUp className="w-10 h-10 text-blue-500" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Crypto Monetizer</h1>
            <p className="text-gray-400">Connect your wallet to detect assets and find the best liquidation rates across 6+ exchanges.</p>
          </div>
          <div className="space-y-3">
            {connectors.map((connector) => {
              const isSafe = connector.id === 'walletConnect' || connector.id === 'coinbaseWalletSDK';
              return (
                <button
                  key={connector.id}
                  onClick={() => connect({ connector })}
                  className={cn(
                    "w-full flex items-center justify-between p-4 glass-card transition-all group relative overflow-hidden",
                    isSafe ? "border-blue-500/50 bg-blue-500/5 hover:bg-blue-500/10" : "hover:bg-white/5 opacity-80 hover:opacity-100"
                  )}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium flex items-center gap-2">
                      {connector.name}
                      {isSafe && (
                        <span className="text-[8px] bg-blue-500 text-white px-1.5 py-0.5 rounded uppercase font-bold tracking-tighter">
                          Recommended
                        </span>
                      )}
                    </span>
                    {isSafe && (
                      <span className="text-[10px] text-gray-500 font-normal">
                        Works best in preview frames
                      </span>
                    )}
                  </div>
                  <ArrowUpRight className={cn(
                    "w-4 h-4 transition-colors",
                    isSafe ? "text-blue-500" : "text-gray-500 group-hover:text-white"
                  )} />
                </button>
              );
            })}
          </div>
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2 text-left">
            <div className="flex items-center gap-2 text-amber-500 text-xs font-bold uppercase tracking-widest">
              <AlertCircle className="w-4 h-4" />
              Iframe Security Warning
            </div>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Browser extensions like <strong>Trust Wallet</strong> often block connections inside iframes (like this preview). 
              To connect successfully, please use <strong>WalletConnect</strong> and scan the QR code with your mobile app.
            </p>
          </div>
          <div className="pt-4 flex items-center justify-center gap-2 text-xs text-gray-500 uppercase tracking-widest font-mono">
            <ShieldCheck className="w-3 h-3" />
            Secure & Non-Custodial
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 lg:p-12 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-500 font-mono text-xs uppercase tracking-widest">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            Live Network Status
          </div>
          <h1 className="text-4xl font-serif italic font-medium">Portfolio Terminal</h1>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowSettings(true)}
            className="p-3 glass-card hover:bg-white/5 transition-colors relative"
          >
            <Settings className="w-5 h-5 text-gray-400" />
            {!binanceWallet && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#0A0A0B]" />
            )}
          </button>
          <div className="flex items-center gap-3 px-4 py-2 glass-card">
            <div className="text-right">
              <div className="text-[10px] text-gray-500 uppercase font-mono tracking-tighter">Connected Wallet</div>
              <div className="text-sm font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</div>
            </div>
            <button onClick={() => disconnect()} className="p-2 hover:bg-white/5 rounded-lg text-gray-400">
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Assets */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-mono uppercase text-gray-500 tracking-widest">Detected Assets</h2>
              <RefreshCw className="w-4 h-4 text-gray-500 cursor-pointer hover:rotate-180 transition-transform duration-500" />
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type="text"
                value={assetSearch}
                onChange={(e) => setAssetSearch(e.target.value)}
                placeholder="Search assets..."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs font-mono focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-mono text-gray-500 tracking-widest">Amount to Monetize (ETH)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={monetizeAmount}
                    onChange={(e) => setMonetizeAmount(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 font-mono text-sm focus:outline-none focus:border-blue-500 transition-colors pr-16"
                    placeholder="0.00"
                    step="0.01"
                  />
                  <button 
                    onClick={() => balance && setMonetizeAmount(formatUnits(balance.value, balance.decimals))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-blue-500/10 text-blue-500 rounded-md text-[10px] font-bold uppercase hover:bg-blue-500/20 transition-colors"
                  >
                    Max
                  </button>
                </div>
              </div>

              {/* Native Asset (ETH or BNB) */}
              {(!assetSearch || (chainId === 56 ? 'bnb' : 'eth').includes(assetSearch.toLowerCase())) && (
                <div className="p-4 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center overflow-hidden">
                      <img 
                        src={chainId === 56 ? "https://cryptologos.cc/logos/binance-coin-bnb-logo.png" : "https://cryptologos.cc/logos/ethereum-eth-logo.png"} 
                        className="w-6 h-6" 
                        alt={chainId === 56 ? "BNB" : "ETH"} 
                      />
                    </div>
                    <div>
                      <div className="font-bold">{chainId === 56 ? 'BNB' : 'Ethereum'}</div>
                      <div className="text-xs text-gray-500">{chainId === 56 ? 'BNB' : 'ETH'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono">
                      {balance ? formatUnits(balance.value, balance.decimals).slice(0, 8) : '0.00'}
                    </div>
                    <div className="text-xs text-gray-500">
                      ≈ ${balance ? (Number(formatUnits(balance.value, balance.decimals)) * (chainId === 56 ? 625 : 2500)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                    </div>
                  </div>
                </div>
              )}

              {/* ERC-20 Tokens */}
              {currentChainTokens.filter(token => {
                if (!assetSearch) return true;
                const search = assetSearch.toLowerCase();
                return token.symbol.toLowerCase().includes(search);
              }).map((token) => {
                const originalIndex = currentChainTokens.findIndex(t => t.address === token.address);
                if (!tokenData) return null;
                const balanceVal = tokenData[originalIndex * 3]?.result as unknown as bigint;
                const decimals = tokenData[originalIndex * 3 + 1]?.result as unknown as number;
                const symbol = tokenData[originalIndex * 3 + 2]?.result as unknown as string;

                if (!balanceVal || balanceVal === 0n) return null;

                const formatted = formatUnits(balanceVal, decimals || 18);
                const price = symbol === 'WBTC' || symbol === 'BTC' ? 67000 : symbol === 'SHIB' ? 0.00003 : 1;

                return (
                  <div key={token.address} className="p-4 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center overflow-hidden p-2">
                        <img src={token.icon} className="w-full h-full object-contain" alt={symbol} />
                      </div>
                      <div>
                        <div className="font-bold">{symbol}</div>
                        <div className="text-xs text-gray-500">{symbol}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono">
                        {Number(formatted).toFixed(symbol === 'SHIB' ? 0 : 4)}
                      </div>
                      <div className="text-xs text-gray-500">
                        ≈ ${(Number(formatted) * price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {tokensLoading && (
                <div className="p-4 bg-white/5 rounded-xl border border-white/5 flex items-center justify-center gap-3 text-xs text-gray-500">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Scanning for tokens...
                </div>
              )}

              <div className="p-4 opacity-50 border border-dashed border-white/10 rounded-xl flex items-center justify-center text-xs text-gray-500 italic">
                Scanning for other ERC-20 tokens...
              </div>
            </div>

            <button 
              disabled={monetizing}
              onClick={handleMonetize}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
            >
              {monetizing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ArrowRightLeft className="w-5 h-5" />}
              Monetize Assets
            </button>
          </div>

          <div className="glass-card p-6">
            <h2 className="text-sm font-mono uppercase text-gray-500 tracking-widest mb-4">Destination</h2>
            {binanceWallet ? (
              <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <div className="flex-1 overflow-hidden">
                  <div className="text-[10px] text-emerald-500 uppercase font-mono">Binance USDT Wallet</div>
                  <div className="text-xs font-mono truncate">{binanceWallet}</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <div className="flex-1">
                  <div className="text-[10px] text-red-500 uppercase font-mono">Missing Destination</div>
                  <div className="text-xs">Attach Binance wallet to receive USDT</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Market Comparison */}
        <div className="lg:col-span-8 space-y-6">
          <div className="glass-card overflow-hidden">
            <div className="p-6 border-bottom border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div>
                <h2 className="text-lg font-medium">Exchange Comparison</h2>
                <p className="text-xs text-gray-500">Real-time best-price routing across top CEX/DEX</p>
              </div>
              <div className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full text-[10px] font-mono uppercase tracking-widest">
                ETH / USDT
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] text-gray-500 uppercase font-mono tracking-widest border-b border-white/5">
                    <th className="px-6 py-4 font-medium">Exchange</th>
                    <th className="px-6 py-4 font-medium">Price (ETH)</th>
                    <th className="px-6 py-4 font-medium">Fee (USD)</th>
                    <th className="px-6 py-4 font-medium">Net Profit</th>
                    <th className="px-6 py-4 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-4 text-blue-500">
                          <RefreshCw className="w-10 h-10 animate-spin opacity-50" />
                          <p className="text-sm font-mono uppercase tracking-widest">Fetching Live Rates...</p>
                        </div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-4 text-red-500">
                          <AlertCircle className="w-10 h-10 opacity-50" />
                          <div className="space-y-1">
                            <p className="text-sm font-bold uppercase tracking-widest">Market Data Unavailable</p>
                            <p className="text-xs text-gray-500 max-w-xs mx-auto">{error}</p>
                          </div>
                          <button 
                            onClick={fetchRates}
                            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-xs font-bold uppercase transition-colors"
                          >
                            Retry Connection
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : rates.length > 0 ? (
                    rates.map((exchange, idx) => (
                      <tr 
                        key={exchange.name} 
                        className={cn(
                          "data-row group",
                          idx === 0 && "bg-blue-500/[0.03]"
                        )}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold",
                              idx === 0 ? "bg-blue-500 text-white" : "bg-white/5 text-gray-400"
                            )}>
                              {exchange.name[0]}
                            </div>
                            <span className="font-medium">{exchange.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-sm">
                          ${(exchange.rate * 2500).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-gray-500">
                          ${((exchange.rate * 2500) * Number(monetizeAmount || 0) * exchange.fee).toFixed(2)}
                          <span className="ml-1 opacity-50">({(exchange.fee * 100).toFixed(2)}%)</span>
                        </td>
                        <td className="px-6 py-4 font-mono text-sm text-emerald-400">
                          ${((exchange.rate * 2500) * Number(monetizeAmount || 0) * (1 - exchange.fee)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {idx === 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-md text-[10px] font-bold uppercase">
                              Best Rate
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-600 uppercase font-mono">Available</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-4 text-gray-500">
                          <TrendingUp className="w-10 h-10 opacity-20" />
                          <p className="text-sm">Click "Monetize Assets" to compare live rates</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Execution Progress */}
          <AnimatePresence>
            {monetizing && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="glass-card p-8 bg-blue-600/5 border-blue-500/20"
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-medium">Monetization in Progress</h3>
                  <div className="text-xs font-mono text-blue-500 uppercase tracking-widest">Step {step === 'comparing' ? '1' : '2'} of 2</div>
                </div>

                <div className="relative flex justify-between items-center max-w-lg mx-auto">
                  <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/5 -translate-y-1/2 z-0" />
                  <div 
                    className="absolute top-1/2 left-0 h-0.5 bg-blue-500 -translate-y-1/2 z-0 transition-all duration-1000" 
                    style={{ width: step === 'comparing' ? '50%' : step === 'executing' ? '100%' : '0%' }}
                  />
                  
                  {[
                    { id: 'comparing', label: 'Comparing Rates', icon: TrendingUp },
                    { id: 'executing', label: 'Executing Swap', icon: ArrowRightLeft },
                    { id: 'success', label: 'Transferring USDT', icon: CheckCircle2 },
                  ].map((s, i) => {
                    const Icon = s.icon;
                    const isActive = step === s.id;
                    const isDone = i < ['comparing', 'executing', 'success'].indexOf(step);
                    
                    return (
                      <div key={s.id} className="relative z-10 flex flex-col items-center gap-3">
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-500",
                          isActive ? "bg-blue-600 border-blue-400 scale-110 shadow-lg shadow-blue-500/40" : 
                          isDone ? "bg-emerald-600 border-emerald-400" : "bg-[#141417] border-white/10"
                        )}>
                          <Icon className={cn("w-5 h-5", (isActive || isDone) ? "text-white" : "text-gray-500")} />
                        </div>
                        <span className={cn(
                          "text-[10px] uppercase font-mono tracking-widest",
                          isActive ? "text-blue-400" : isDone ? "text-emerald-400" : "text-gray-600"
                        )}>
                          {s.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md glass-card p-8 space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-2xl font-serif italic">Liquidation Settings</h2>
                <p className="text-sm text-gray-400">Configure where your USDT profits should be sent after monetization.</p>
              </div>

              <div className="space-y-4">
                {settingsError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-500 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {settingsError}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-mono text-gray-500 tracking-widest">Binance USDT Address (BEP-20 / ERC-20)</label>
                  <input 
                    type="text" 
                    value={binanceWallet}
                    onChange={(e) => setBinanceWallet(e.target.value)}
                    placeholder="0x..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 font-mono text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="flex-1 py-3 glass-card hover:bg-white/5 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={saveSettings}
                  disabled={isSaving}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20"
                >
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
