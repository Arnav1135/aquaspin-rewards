using System;
using UnityEngine;

namespace UnityChess.Gameplay
{
    [RequireComponent(typeof(AudioSource))]
    public class AudioManager : MonoBehaviour
    {
        public static AudioManager Instance { get; private set; }

        private AudioSource audioSource;
        
        // Procedural Audio State
        private bool isPlayingSound = false;
        private float soundDuration = 0f;
        private float soundTime = 0f;
        private float baseFrequency = 440f;
        private int soundType = 0; // 0 = Move, 1 = Capture, 2 = Check/Game Over

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                audioSource = GetComponent<AudioSource>();
                audioSource.playOnAwake = false;
                audioSource.loop = true; // We keep it playing but mute output when not needed
                audioSource.Play();
            }
            else
            {
                Destroy(gameObject);
            }
        }

        public void PlayMoveSound()
        {
            TriggerSound(150f, 0.1f, 0); // Low dull thud
        }

        public void PlayCaptureSound()
        {
            TriggerSound(300f, 0.15f, 1); // Higher pitched crack
        }

        public void PlayGameOverSound()
        {
            TriggerSound(800f, 0.5f, 2); // Bell-like ding
        }

        private void TriggerSound(float frequency, float duration, int type)
        {
            baseFrequency = frequency;
            soundDuration = duration;
            soundType = type;
            soundTime = 0f;
            isPlayingSound = true;
        }

        private void OnAudioFilterRead(float[] data, int channels)
        {
            if (!isPlayingSound)
            {
                for (int i = 0; i < data.Length; i++) data[i] = 0;
                return;
            }

            double sampleRate = AudioSettings.outputSampleRate;

            for (int i = 0; i < data.Length; i += channels)
            {
                soundTime += 1f / (float)sampleRate;
                
                if (soundTime > soundDuration)
                {
                    isPlayingSound = false;
                    for (int j = 0; j < channels; j++) data[i + j] = 0;
                    continue;
                }

                float sample = 0;

                // Envelope (ADSR simplified to simple exponential decay)
                float envelope = Mathf.Exp(-5f * (soundTime / soundDuration));

                if (soundType == 0) // Move (Thud)
                {
                    // Sine wave sweep down
                    float currentFreq = baseFrequency * Mathf.Exp(-15f * soundTime);
                    sample = Mathf.Sin(2 * Mathf.PI * currentFreq * soundTime) * envelope;
                }
                else if (soundType == 1) // Capture (Crack)
                {
                    // Noise burst + Sine
                    float noise = (UnityEngine.Random.value * 2f - 1f) * 0.5f;
                    sample = (Mathf.Sin(2 * Mathf.PI * baseFrequency * soundTime) + noise) * envelope;
                }
                else if (soundType == 2) // Game Over (Bell)
                {
                    // FM Synthesis basic bell
                    float fm = Mathf.Sin(2 * Mathf.PI * baseFrequency * 2.5f * soundTime) * 2f;
                    sample = Mathf.Sin(2 * Mathf.PI * baseFrequency * soundTime + fm) * envelope;
                }

                for (int j = 0; j < channels; j++)
                {
                    data[i + j] = sample * 0.5f; // Master volume
                }
            }
        }
    }
}
