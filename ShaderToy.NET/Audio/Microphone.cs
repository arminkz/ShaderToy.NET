using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NAudio.CoreAudioApi;
using NAudio.Wave;
using System.Windows.Controls;

namespace ShaderToy.NET
{
    class Microphone
    {

        // Other inputs are also usable. Just look through the NAudio library.
        private IWaveIn waveIn;
        private static int fftLength = 1024; // NAudio fft wants powers of two!
        public event EventHandler<FftEventArgs> FftCalculated;

        // There might be a sample aggregator in NAudio somewhere but I made a variation for my needs
        private MicrophoneAggregator sampleAggregator = new MicrophoneAggregator(fftLength);

        public Microphone(MMDevice mmd)
        {

            // Here you decide what you want to use as the waveIn.
            // There are many options in NAudio and you can use other streams/files.
            // Note that the code varies for each different source.
            waveIn = new WasapiCapture(mmd);
            waveIn.DataAvailable += OnDataAvailable;

            sampleAggregator.FftCalculated += (s, a) => FftCalculated?.Invoke(this, a);
            sampleAggregator.PerformFFT = true;


        }

        public void StartRecording()
        {
            waveIn.StartRecording();
        }

        public void StopRecording()
        {
            waveIn.StopRecording();
        }

        void OnDataAvailable(object sender, WaveInEventArgs e)
        {
            byte[] buffer = e.Buffer;
            int bytesRecorded = e.BytesRecorded;
            int bufferIncrement = waveIn.WaveFormat.BlockAlign;

            for (int index = 0; index < bytesRecorded; index += bufferIncrement)
            {
                float sample32 = BitConverter.ToSingle(buffer, index);
                sampleAggregator.Add(sample32);
                //Console.Write("A");
            }
            /*if (this.InvokeRequired)
            {
                this.BeginInvoke(new EventHandler<WaveInEventArgs>(OnDataAvailable), sender, e);
            }
            else
            {

            }*/
        }

    }
}
