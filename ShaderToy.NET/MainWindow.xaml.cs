using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Navigation;
using System.Windows.Shapes;
using System.Drawing;

using MahApps.Metro.Controls;

using SharpGL;
using SharpGL.SceneGraph.Primitives;
using SharpGL.SceneGraph;
using SharpGL.SceneGraph.Assets;
using Microsoft.Win32;

using NAudio.CoreAudioApi;

namespace ShaderToy.NET
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainWindow : MetroWindow
    {
        OpenGL gl;
        ShaderScene scn;
        List<Shader> shaders = new List<Shader>();

        AudioPlayback aud = new AudioPlayback();
        Microphone mic;

        AudioBitmap ab = new AudioBitmap();

        BitmapImage Ch0Image;

        public MainWindow()
        {
            InitializeComponent();

            LoadWasapiDevicesCombo();
            MicCombo.SelectedIndex = 0;
            mic = new Microphone((MMDevice)MicCombo.SelectedItem);
            
            aud.FftCalculated += OnFftCalculated;
            mic.FftCalculated += OnFftCalculated;

            //Init Shaders
            //shaders.Add(new Shader("Waves", "waves_audio"));
            //shaders.Add(new Shader("Menger", "menger"));
            //shaders.Add(new Shader("Boxy", "boxy_audio"));
            //shaders.Add(new Shader("Waves Remix", "wave_remix_audio"));
            //shaders.Add(new Shader("Polar","polar_audio"));
            //shaders.Add(new Shader("Music Ball", "music_ball_audio"));
            //shaders.Add(new Shader("Cubescape","cubescape_audio"));
            //shaders.Add(new Shader("Mandelbrot", "mandelbrot"));
            //shaders.Add(new Shader("QSA", "qsa"));
            shaders.Add(new Shader("Sea", "sea"));


            scn = new ShaderScene(shaders[0]);
            shaderSelector.ItemsSource = shaders;
            shaderSelector.SelectedIndex = 0;

            ab.OnBitmapUpdated += (s, a) => scn.UpdateTextureBitmap(gl, 0, a.image);
        }

       

        private void OpenGLControl_OpenGLDraw(object sender, OpenGLEventArgs args)
        {
            //OpenGL gl = args.OpenGL;

            //scn.UpdateTextureBitmap(gl, 0, ImageHelper.BitmapImage2Bitmap(Ch0Image));
            //scn.UpdateTextureBitmap(gl, 1, ab.lastBitmap);
            //scn.UpdateTextureBitmap(gl, 1, ImageHelper.BitmapImage2Bitmap(Ch0Image));

            scn.Draw(gl,(float)OpenGLControl.ActualWidth, (float)OpenGLControl.ActualHeight);
            //scn.Draw(gl, 300, 300);
        }

        private void OpenGLControl_OpenGLInitialized(object sender, OpenGLEventArgs args)
        {
            gl = args.OpenGL;
            scn.Initialise(gl);

            //init channel 0 (image)
            Ch0Image = new BitmapImage(new Uri(@"C:/sta.jpg"));
            CHO_ImageBox.Source = Ch0Image;
            scn.UpdateTextureBitmap(gl, 1, ImageHelper.BitmapImage2Bitmap(Ch0Image));
            //scn.UpdateTextureBitmap(gl, 1, ab.lastBitmap);

            //texture1.Create(gl, ImageHelper.BitmapImage2Bitmap(Ch0Image));
            //texture1.TextureName = "iChannel1";

            //init channel 1 (audio)
            //texture2.Create(gl);
            
            
        }

        public void OnFftCalculated(object sender,FftEventArgs e)
        {
            NAudio.Dsp.Complex[] result = e.Result;
            this.Dispatcher.Invoke(new Action(() => {
                SpecAnalyser.Update(result);
                ab.Update(OpenGLControl.OpenGL, result);
            }));
        }

        private void Play_Audio(object sender, RoutedEventArgs e)
        {
            aud.Play();
        }

        private void Pause_Audio(object sender, RoutedEventArgs e)
        {
            aud.Pause();
        }

        private void Stop_Audio(object sender, RoutedEventArgs e)
        {
            aud.Stop();
        }

        private void Load_Audio(object sender, RoutedEventArgs e)
        {
            OpenFileDialog ofd = new OpenFileDialog();
            ofd.Title = "Select Audio File";
            ofd.Filter = "All Supported Files (*.wav;*.mp3)|*.wav;*.mp3";
            bool? result = ofd.ShowDialog();
            if(result.HasValue && result.Value)
            {
                aud.Stop();
                aud.Load(ofd.FileName);
                Play_Button.IsEnabled = true;
                Pause_Button.IsEnabled = true;
                Stop_Button.IsEnabled = true;
            }
        }

        bool isFullScreen = false;
        private void MakeFullScreen(object sender, RoutedEventArgs e)
        {
            if (!isFullScreen)
            {
                this.ShowTitleBar = false;
                this.WindowState = WindowState.Maximized;
                MainGrid.ColumnDefinitions[1].Width = new GridLength(0);
                isFullScreen = true;
            }
            else
            {
                this.ShowTitleBar = true;
                this.WindowState = WindowState.Normal;
                MainGrid.ColumnDefinitions[1].Width = new GridLength(250);
                isFullScreen = false;
            }

        }

        private void Shader_SelectedChanged(object sender, SelectionChangedEventArgs e)
        {
            scn.ActiveShader = shaders[shaderSelector.SelectedIndex];
        }

        private void Start_Mic(object sender, RoutedEventArgs e)
        {
            mic.StartRecording();
            MicStop_Button.IsEnabled = true;
            MicStart_Button.IsEnabled = false;
        }

        private void Stop_Mic(object sender, RoutedEventArgs e)
        {
            mic.StopRecording();
            MicStop_Button.IsEnabled = false;
            MicStart_Button.IsEnabled = true;
        }

        //public ObservableCollection<MMDevice> MicDevices;
        private void LoadWasapiDevicesCombo()
        {
            var deviceEnum = new MMDeviceEnumerator();
            var devices = deviceEnum.EnumerateAudioEndPoints(DataFlow.Capture, DeviceState.Active).ToList();


            MicCombo.ItemsSource = devices;
            MicCombo.DisplayMemberPath = "FriendlyName";
        }

        private void Load_Image(object sender, RoutedEventArgs e)
        {
            OpenFileDialog ofd = new OpenFileDialog();
            ofd.Title = "Select Image File";
            //ofd.Filter = "All Supported Files (*.wav;*.mp3)|*.wav;*.mp3";
            bool? result = ofd.ShowDialog();
            if (result.HasValue && result.Value)
            {
                Ch0Image = new BitmapImage(new Uri(ofd.FileName));
                CHO_ImageBox.Source = Ch0Image;
                scn.UpdateTextureBitmap(gl, 1, ImageHelper.BitmapImage2Bitmap(Ch0Image));
            }
            
        }
    }
}
